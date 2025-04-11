import CloneIcon from '@/components/icons/Clone';

function TemplateBlock({ name }: { name: string }) {
  return (
    <div className="border-primary-6 flex flex-col gap-2 border p-5">
      <div className="flex justify-between">
        <div className="text-xl font-bold">{name}</div>
        <div className="flex items-center gap-2">
          <CloneIcon />
        </div>
      </div>
      <div className="text-primary-2 max-w-[300px]">
        Sed turpis tincidunt id aliquet risus. Duis tristique sollicitudin nibh sit amet.
      </div>
    </div>
  );
}

export default function SimCampUIConfigTemplateGrid() {
  return (
    <div className="grid grid-cols-2 gap-6">
      <TemplateBlock name="Template n°1" />
      <TemplateBlock name="Template n°2" />
      <TemplateBlock name="Template n°3" />
      <TemplateBlock name="Template n°4" />
    </div>
  );
}
