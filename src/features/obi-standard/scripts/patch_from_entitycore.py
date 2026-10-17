"""Patch the OBI Standard snapshot (data/standard-data.json) from entitycore and obi-one.

Run with entitycore's Python, its checkout on the path, e.g.

    PYTHONPATH=../entitycore ../entitycore/.venv/bin/python \
        src/features/obi-standard/scripts/patch_from_entitycore.py

It reads
  - entitycore's live OpenAPI schema (staging): every entry's properties, required and nullable;
  - entitycore's pydantic Read classes: which parent class each property comes from;
  - entitycore's asset-label rules (app/db/types.py): each entry's accepted files;
  - obi-one's live OpenAPI schema: the endpoints to use for a validated registration.
and rewrites the snapshot: the entries already there keep their titles and words, and gain the task
entries (TaskConfig, TaskActivity and one per TaskResult type).
"""

import importlib
import inspect
import json
import pkgutil
import re
import urllib.request
from pathlib import Path

ENTITYCORE_API = "https://staging.openbraininstitute.org/api/entitycore/openapi.json"
OBI_ONE_API = "https://staging.openbraininstitute.org/api/obi-one/openapi.json"
OBI_ONE_BASE = "/api/obi-one"
SNAPSHOT = Path(__file__).resolve().parents[1] / "data" / "standard-data.json"

# the envelope every entity carries: listed apart, as "Common entity fields"
COMMON = {
    "id", "type", "assets", "authorized_project_id", "authorized_public", "lifecycle_status",
    "creation_date", "update_date", "created_by", "updated_by", "contributions",
    "generated_from_derivations", "used_by_derivations",
}  # fmt: skip


def fetch(url):
    with urllib.request.urlopen(url, timeout=60) as r:  # noqa: S310
        return json.load(r)


def display(cls_name):
    """A class's name as the standard shows it: ScientificArtifactRead -> ScientificArtifact."""
    for suffix in ("ReadMixin", "Mixin", "Read", "Base"):
        cls_name = cls_name.removesuffix(suffix)
    return cls_name


def read_classes():
    """entitycore's Read classes by name."""
    import app.schemas as pkg

    found = {}
    for mi in pkgutil.walk_packages(pkg.__path__, "app.schemas."):
        try:
            mod = importlib.import_module(mi.name)
        except Exception:  # noqa: BLE001, S112
            continue
        for n, c in vars(mod).items():
            if inspect.isclass(c) and hasattr(c, "model_fields") and n.endswith("Read"):
                found.setdefault(n, c)
    return found


def origins(cls):
    """Where each field comes from: the most basic parent class that has it; else the mixin that
    brings it; else None, the class's own."""
    mro = [b for b in cls.__mro__ if hasattr(b, "model_fields")]
    is_mixin = lambda b: "Mixin" in b.__name__ or b.__name__ in ("Schema", "BaseModel")  # noqa: E731
    chain = [b for b in mro if not is_mixin(b)]
    out = {}
    for f in cls.model_fields:
        parent = next((b for b in reversed(chain[1:]) if f in b.model_fields), None)
        if parent:
            out[f] = display(parent.__name__)
            continue
        definer = next((b for b in mro if f in b.__dict__.get("__annotations__", {})), cls)
        out[f] = None if definer is cls else display(definer.__name__)
    return out


def convert(name, sc, required, schemas, slug_of, origin):
    """An OpenAPI property, in the standard's terms."""
    nullable = False
    if "anyOf" in sc:
        rest = [x for x in sc["anyOf"] if x.get("type") != "null"]
        nullable = len(rest) < len(sc["anyOf"])
        sc = {**sc, **(rest[0] if rest else {})}
        sc.pop("anyOf", None)
    is_array = sc.get("type") == "array"
    item = sc.get("items", {}) if is_array else sc
    p = {"name": name}
    ref = item.get("$ref", "").split("/")[-1]
    if ref:
        label = display(ref.removeprefix("Nested"))
        p["typeLabel"] = label + ("[]" if is_array else "")
        p["refSchema"] = ref
        if label in slug_of:
            p["refSlug"] = slug_of[label]
        enum = schemas.get(ref, {}).get("enum")
        if enum:
            p["enumValues"] = enum
    else:
        base = item.get("type", "object")
        p["typeLabel"] = base + ("[]" if is_array else "")
        if item.get("format"):
            p["format"] = item["format"]
        if item.get("enum"):
            p["enumValues"] = item["enum"]
    desc = sc.get("description") or schemas.get(ref, {}).get("description")
    if desc:
        p["description"] = desc
    p |= {"required": name in required, "nullable": nullable, "isArray": is_array}
    if "default" in sc and sc["default"] is not None:
        p["defaultValue"] = sc["default"]
    if origin:
        p["inheritedFrom"] = origin
    return p


def files_of(rules, suffixes):
    """Accepted files from entitycore's label rules: each label, each content type it takes."""
    return [
        {
            "label": str(label),
            "variants": [
                {
                    "label": str(label),
                    "contentType": r.content_type.name if r.content_type else None,
                    "mime": str(r.content_type) if r.content_type else None,
                    "suffixes": suffixes.get(r.content_type.name, []) if r.content_type else [],
                    "isDirectory": bool(r.is_directory),
                    "description": r.description or "",
                }
                for r in reqs
            ],
        }
        for label, reqs in (rules or {}).items()
    ]


def sdk_for(model, title, key, files, setup):
    """entitysdk snippets: fetch, query, register (and upload, if it takes files)."""
    var = re.sub(r"(?<!^)(?=[A-Z])", "_", model).lower()
    extra = f'\n        {key[0]}="{key[1]}",' if key else ""
    ops = [
        {"label": "Fetch", "code": f'# Fetch one {title} by id\nentity = client.get_entity(\n    UUID("<{var}-id>"),\n    entity_type=models.{model},\n)'},
        {"label": "Query", "code": f"# Query {title} entities (filter keys are the entity's fields)\nresults = client.search_entity(\n    entity_type=models.{model},\n    query={{{f'\"{key[0]}\": \"{key[1]}\"' if key else '\"name__ilike\": \"<search text>\"'}}},\n    limit=10,\n)\nfor entity in results:\n    print(entity.id, entity.name)"},
        {"label": "Register", "code": f'# Register a new {title}\nentity = client.register_entity(\n    models.{model}(\n        name="<name>",\n        description="<description>",{extra}\n        # ...plus this type\'s required properties\n    )\n)'},
    ]  # fmt: skip
    if files:
        v = files[0]["variants"][0]
        suffix = (v["suffixes"] or [""])[0]
        ops.append({"label": "Upload file", "code": f'# Attach a file as the "{files[0]["label"]}" asset\nclient.upload_file(\n    entity_id=entity.id,\n    entity_type=models.{model},\n    file_path="path/to/file{suffix}",\n    file_content_type="{v["mime"]}",\n    asset_label="{files[0]["label"]}",\n)'})  # fmt: skip
    return {"setup": setup, "operations": ops}


# obi-one's endpoints for a validated registration, by entity type: (path, what it does)
OBI_ONE = {
    "circuit": ["/declared/circuit/register", "/declared/circuit/{circuit_id}/validate", "/declared/circuit/{circuit_id}/generate-assets"],
    "cell_morphology": ["/declared/test-neuron-file", "/declared/register-morphology-with-calculated-metrics", "/declared/neuron-morphology-metrics/{cell_morphology_id}/register"],
    "em_cell_mesh": ["/declared/test-mesh-file", "/declared/{entity_id}/register-mesh", "/declared/{entity_id}/generate-lod"],
    "electrical_cell_recording": ["/declared/validate-electrophysiology-protocol-nwb-file"],
    "subject": ["/declared/subject"],
}  # fmt: skip


def registration(entity_type, obi):
    out = []
    for path in OBI_ONE.get(entity_type, []):
        op = obi["paths"].get(path, {}).get("post")
        if not op:
            continue
        body = list(op.get("requestBody", {}).get("content", {}))
        out.append(
            {
                "method": "POST",
                "path": OBI_ONE_BASE + path,
                "summary": op.get("summary", ""),
                "description": (op.get("description") or "").strip().split("\n\n")[0],
                "body": body[0] if body else None,
            }
        )
    return out


def human(key):
    """circuit_simulation__result -> Circuit simulation result."""
    words = key.replace("__", " ").replace("_", " ")
    return words[0].upper() + words[1:]


def main():
    from app.db import types as T

    api = fetch(ENTITYCORE_API)
    obi = fetch(OBI_ONE_API)
    schemas = api["components"]["schemas"]
    classes = read_classes()
    std = json.loads(SNAPSHOT.read_text())
    suffixes = {c["name"]: c["suffixes"] for c in std["contentTypes"]}
    suffixes |= {k.name: [str(v)] if isinstance(v, str) else list(v) for k, v in T.CONTENT_TYPE_TO_SUFFIX.items()}
    setup = std["entities"][0]["sdk"]["setup"]
    slug_of = {display(e["schema"]): e["slug"] for e in std["entities"]}

    def properties(schema, keep):
        sc = schemas[schema]
        req = set(sc.get("required", []))
        orig = origins(classes[schema]) if schema in classes else {}
        old = {p["name"]: p for p in keep}
        props = []
        for name, psc in sc["properties"].items():
            p = convert(name, psc, req, schemas, slug_of, orig.get(name))
            # the words already written for it stay
            if not p.get("description") and old.get(name, {}).get("description"):
                p["description"] = old[name]["description"]
            props.append(p)
        own = [p for p in props if p["name"] not in COMMON]
        common = [p for p in props if p["name"] in COMMON]
        return own, common, classes[schema].__mro__ if schema in classes else ()

    def parents(schema):
        if schema not in classes:
            return []
        chain = [b.__name__ for b in classes[schema].__mro__ if hasattr(b, "model_fields")]
        return [display(n) for n in chain[1:] if "Mixin" not in n and n not in ("Schema", "BaseModel")]

    # the entries already there
    for e in std["entities"]:
        e["properties"], e["commonProperties"], _ = properties(
            e["schema"], e["properties"] + e["commonProperties"]
        )
        e["parents"] = list(dict.fromkeys(parents(e["schema"])))
        # (some, such as the ion channel, are not entities, and take no files)
        rules = {str(k): v for k, v in T.ALLOWED_ASSET_LABELS_PER_ENTITY.items()}
        e["files"] = files_of(rules.get(e["entityType"]), suffixes)
        e["sdk"] = sdk_for(
            e["sdk"]["operations"][0]["code"].split("models.")[1].split(",")[0].split(")")[0],
            e["title"], None, e["files"], setup,
        )
        e["registration"] = registration(e["entityType"], obi)

    # the tasks: one category, the generic config and activity, and each kind of result
    if not any(c["id"] == "tasks" for c in std["categories"]):
        std["categories"].append({"id": "tasks", "title": "Tasks", "blurb": "Generic task configurations, their runs, and what each kind of run produces, told apart by a task type key."})
    std["entities"] = [e for e in std["entities"] if e["category"] != "tasks"]
    generic = [
        ("task-config", "Task Config", "TaskConfigRead", "task_config", "/task-config", "TaskConfig", "task_config_type", list(T.TaskConfigType),
         "The configuration of a task, of any kind: one entity type for them all, its kind set by task_config_type.",
         "A Task Config holds the configuration of a task to run on the platform — a circuit simulation's config or campaign, an extraction's, an ion channel modelling's, and so on. Rather than a type of its own for each, every task's configuration is a Task Config, told apart by its task_config_type key; its inputs and meta carry what that kind of task needs. The kinds are listed in task_config_type's values."),
        ("task-activity", "Task Activity", "TaskActivityRead", "task_activity", "/task-activity", "TaskActivity", "task_activity_type", list(T.TaskActivityType),
         "A run of a task, of any kind: one activity type for them all, its kind set by task_activity_type.",
         "A Task Activity records a run of a task — its executor and execution id, start and end, status, what it used and what it generated. Every kind of task run is a Task Activity, told apart by its task_activity_type key (config generation, execution, and so on, for each kind of task). The kinds are listed in task_activity_type's values."),
    ]  # fmt: skip
    tasks = []
    for slug, title, schema, et, path, model, key, kinds, short, desc in generic:
        own, common, _ = properties(schema, [])
        files = files_of({str(k): v for k, v in T.ALLOWED_ASSET_LABELS_PER_ENTITY.items()}.get(et), suffixes)
        tasks.append({"slug": slug, "title": title, "category": "tasks", "short": short, "description": desc,
                      "schema": schema, "entityType": et, "apiPath": path, "found": True, "properties": own,
                      "commonProperties": common, "parents": parents(schema), "files": files,
                      "sdk": sdk_for(model, title, (key, kinds[0]), files, setup), "registration": [],
                      "taskKey": {"name": key, "values": [str(k) for k in kinds]}})  # fmt: skip
    for kind in T.TaskResultType:
        title = human(str(kind))
        files = files_of(T.ALLOWED_ASSET_LABELS_PER_TASK_RESULT.get(kind), suffixes)
        own, common, _ = properties("TaskResultRead", [])
        tasks.append({"slug": "task-result-" + str(kind).replace("__", "-").replace("_", "-"),
                      "title": title, "category": "tasks",
                      "short": f"What a {human(str(kind).split('__')[0]).lower()} task produces: a Task Result with task_result_type {kind}.",
                      "description": f"A Task Result is the generic output of a task run; this is the kind with task_result_type = {kind}. Every kind shares the TaskResultRead schema — its data_payload carries the kind's own data — and differs in the files it accepts, listed below" + (" (none)." if not files else "."),
                      "schema": "TaskResultRead", "entityType": "task_result", "apiPath": "/task-result", "found": True,
                      "properties": own, "commonProperties": common, "parents": parents("TaskResultRead"),
                      "files": files, "sdk": sdk_for("TaskResult", title, ("task_result_type", str(kind)), files, setup),
                      "registration": [], "taskKey": {"name": "task_result_type", "values": [str(kind)]}})  # fmt: skip
    std["entities"] += tasks
    std["generatedFrom"] = "live"
    std["apiVersion"] = api["info"].get("version")
    SNAPSHOT.write_text(json.dumps(std, ensure_ascii=False, separators=(",", ":")))
    print(len(std["entities"]), "entries;", len(tasks), "task entries; API", std["apiVersion"])


if __name__ == "__main__":
    main()
