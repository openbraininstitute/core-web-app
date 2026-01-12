"use client";

import { DatePicker, Form, Input, InputNumber, Space } from "antd";
import { InfoCircleFilled } from "@ant-design/icons";
import dayjs from "dayjs";

import { BrainRegionDropdownWithFormItem } from "@/features/brain-region-dropdown/form-dropdown";
import { CellMorphologySchema } from "@/ui/segments/contribute/cell-morphology/schema";
import { AppUInterfaceSection, resolveDataKey } from "@/utils/key-builder";
import { useWorkspace } from "@/ui/hooks/use-workspace";
import { cn } from "@/utils/css-class";
import {
  renderLabel,
  createZodFieldValidator,
  RequiredFieldMarker,
} from "@/ui/segments/contribute/shared/helpers";

import type { IBrainRegionHierarchy } from "@/api/entitycore/types/entities/brain-region";
import { useWorkspaceAtlasHierarchy } from "@/features/brain-region-hierarchy/hooks";

export function Setup() {
  const form = Form.useFormInstance();
  const { projectId } = useWorkspace();
  const { selectedBrainRegion } = useWorkspaceAtlasHierarchy({
    dataKey: resolveDataKey({ section: AppUInterfaceSection.Data, projectId }),
  });

  const BrainRegionDropdown = BrainRegionDropdownWithFormItem({
    clsx: { trigger: "rounded-full w-full h-12", content: "z-[99999]" },
    showIcon: false,
    charsPerLine: 200,
    defaultBrainRegion: selectedBrainRegion as IBrainRegionHierarchy,
  });

  return (
    <div className="h-full w-full">
      <Form.Item
        name={["setup", "name"]}
        label={renderLabel("Name", "main", RequiredFieldMarker)}
        rules={[
          {
            required: true,
            validator: createZodFieldValidator(
              CellMorphologySchema,
              "setup.name",
              form,
            ),
          },
        ]}
      >
        <Input
          className="h-12 rounded-full placeholder:text-sm"
          size="large"
          placeholder="Enter cell morphology name"
        />
      </Form.Item>

      <Form.Item
        name={["setup", "description"]}
        label={renderLabel("Description", "main", RequiredFieldMarker)}
        rules={[
          {
            required: true,
            validator: createZodFieldValidator(
              CellMorphologySchema,
              "setup.description",
              form,
            ),
          },
        ]}
      >
        <Input.TextArea
          rows={5}
          className="rounded-xl placeholder:text-sm"
          placeholder="Enter cell morphology description"
        />
      </Form.Item>

      <Form.Item
        name={["setup", "brain_region_id"]}
        label={renderLabel("Brain region", "main", RequiredFieldMarker)}
        rules={[
          {
            required: true,
            validator: createZodFieldValidator(
              CellMorphologySchema,
              "setup.brain_region_id",
              form,
            ),
          },
        ]}
      >
        <BrainRegionDropdown />
      </Form.Item>

      <Form.Item
        name={["setup", "experiment_date"]}
        label={renderLabel("Experiment date", "main")}
        rules={[
          {
            required: true,
            validator: createZodFieldValidator(
              CellMorphologySchema,
              "setup.experiment_date",
              form,
            ),
          },
        ]}
      >
        <DatePicker
          className="h-12 w-full rounded-full"
          format="DD/MM/YYYY"
          maxDate={dayjs()}
        />
      </Form.Item>

      <Form.Item
        name={["setup", "contact_email"]}
        label={renderLabel("Contact email", "main")}
        rules={[
          {
            required: false,
            validator: createZodFieldValidator(
              CellMorphologySchema,
              "setup.contact_email",
              form,
            ),
          },
        ]}
      >
        <Input
          className="h-12 rounded-full placeholder:text-sm"
          placeholder="Enter contact email"
        />
      </Form.Item>

      <Form.Item
        name={["setup", "published_in"]}
        label={renderLabel("Published in", "main")}
        rules={[
          {
            required: false,
            validator: createZodFieldValidator(
              CellMorphologySchema,
              "setup.published_in",
              form,
            ),
          },
        ]}
      >
        <Input
          className="h-12 rounded-full placeholder:text-sm"
          placeholder="Enter published in"
        />
      </Form.Item>

      <Form.Item
        label={renderLabel("Location (x, y, z)", "main")}
        tooltip={{
          icon: <InfoCircleFilled />,
          className: "[&_svg]:text-primary-8!",
          rootClassName: cn(
            "[&_.ant-tooltip-inner]:bg-white [&_.ant-tooltip-inner]:text-primary-8 ",
            "[&_.ant-tooltip-arrow]:before:bg-white",
          ),
          title: (
            <div className="flex items-center gap-1">
              <p>Learn more about this field</p>
              <a
                href="https://pubmed.ncbi.nlm.nih.gov/40800985/"
                rel="noopener noreferrer"
                target="_blank"
                className="text-primary-9 underline"
              >
                here
              </a>
            </div>
          ),
        }}
      >
        <Space.Compact className="flex gap-2">
          <Form.Item
            name={["setup", "location", "x"]}
            required={false}
            validateTrigger={["onChange", "onBlur"]}
            rules={[
              {
                validator: createZodFieldValidator(
                  CellMorphologySchema,
                  "setup.location.x",
                  form,
                ),
              },
            ]}
            className="w-1/3"
          >
            <InputNumber
              placeholder="X (microns)"
              size="large"
              className="h-12 w-full rounded-full placeholder:text-sm [&_.ant-input-number-handler-wrap]:hidden"
            />
          </Form.Item>
          <Form.Item
            name={["setup", "location", "y"]}
            required={false}
            validateTrigger={["onChange", "onBlur"]}
            rules={[
              {
                validator: createZodFieldValidator(
                  CellMorphologySchema,
                  "setup.location.y",
                  form,
                ),
              },
            ]}
            className="w-1/3"
          >
            <InputNumber
              placeholder="Y (microns)"
              size="large"
              className="h-12 w-full rounded-full placeholder:text-sm [&_.ant-input-number-handler-wrap]:hidden"
            />
          </Form.Item>
          <Form.Item
            name={["setup", "location", "z"]}
            required={false}
            validateTrigger={["onChange", "onBlur"]}
            rules={[
              {
                validator: createZodFieldValidator(
                  CellMorphologySchema,
                  "setup.location.z",
                  form,
                ),
              },
            ]}
            className="w-1/3"
          >
            <InputNumber
              placeholder="Z (microns)"
              size="large"
              className="h-12 w-full rounded-full placeholder:text-sm [&_.ant-input-number-handler-wrap]:hidden"
            />
          </Form.Item>
        </Space.Compact>
      </Form.Item>
    </div>
  );
}
