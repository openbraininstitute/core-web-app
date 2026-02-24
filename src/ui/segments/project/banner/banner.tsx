'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { RiEditBoxLine } from '@remixicon/react';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Form, type FormProps, Input } from 'antd';
import { delay, get } from 'es-toolkit/compat';
import { type ReactElement, useEffect, useRef, useState } from 'react';
import { z } from 'zod';

import { getProject, updateProject } from '@/api/virtual-lab-svc/queries/project';
import { LabTypeEnum } from '@/api/virtual-lab-svc/types';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button/index';
import { ExpandableText } from '@/ui/molecules/more-less-text';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

type TCardContent = {
  name: string;
  description: string;
};

const maxNameLength = 60;
const maxDescriptionLength = 600;

const projectFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(maxNameLength, 'Name must be less than 60 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(maxDescriptionLength, 'Description must be less than 600 characters'),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

export function ProjectCard(): ReactElement {
  const { virtualLabId, projectId } = useWorkspace();
  const [form] = Form.useForm<ProjectFormValues>();
  const [mounted, setMounted] = useState(false);
  const queryClient = useQueryClient();
  const { data: result, refetch } = useSuspenseQuery({
    queryKey: keyBuilder.getWorkspace({ virtualLabId, projectId }),
    queryFn: () => getProject({ virtualLabId, projectId }),
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const nameRef = useRef<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // only check permissions on client to avoid Suspense boundary issues
  // always call the hook (React rules), but pass undefined during SSR
  const permissionsResult = useUserPermissions({
    virtualLabId: mounted ? virtualLabId : undefined,
    projectId: mounted ? projectId : undefined,
  });
  const isVirtualLabAdmin = mounted ? permissionsResult.isVirtualLabAdmin : false;

  const { mutateAsync, isPending, variables } = useMutation({
    mutationFn: (payload: TCardContent) =>
      updateProject({
        virtualLabId,
        projectId,
        payload,
      }),

    onSettled: async () => {
      await refetch();
      await queryClient.invalidateQueries({
        queryKey: keyBuilder.listWorkspaceProjects({ virtualLabId }),
      });
    },
  });

  const onCancel = (_: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    form.resetFields();
    setIsEditing(false);
    setIsFormValid(false);
  };

  const handleEdit = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();
    setIsEditing(true);
    setIsFormValid(true);
    delay(() => {
      nameRef.current?.focus();
    }, 200);
  };

  const handleSave: FormProps<ProjectFormValues>['onFinish'] = async (values) => {
    await mutateAsync(values);
    setIsEditing(false);
  };

  const handleFormChange = async () => {
    try {
      await form.validateFields({ dirty: true });
      setIsFormValid(true);
    } catch (error) {
      const errors = get(error, 'errorFields', []);
      setIsFormValid(errors.length === 0);
    }
  };

  return (
    <Form
      form={form}
      name="project-form"
      onFinish={handleSave}
      onValuesChange={handleFormChange}
      className={cn(
        'relative w-full overflow-hidden rounded-2xl border border-neutral-2',
        '[&_.ant-form-item-explain-error]:text-sm! hover:shadow-bnb'
      )}
    >
      <div className="h-full w-full p-4 flex flex-col gap-1.5">
        {isEditing ? (
          <Form.Item
            name="name"
            rules={[
              { required: true, message: 'Name is required' },
              { max: maxNameLength, message: 'Name must be less than 60 characters' },
            ]}
            initialValue={result.data.project.name}
          >
            <Input.TextArea
              id="project-name"
              ref={nameRef}
              className={cn(
                'w-full resize-y rounded-lg border border-neutral-2 p-2 text-sm font-bold',
                'text-primary-9 placeholder-white/60 backdrop-blur-sm',
                'transition-all duration-300 placeholder:text-sm lg:text-lg ',
                'focus-within:shadow-none focus-within:border-primary-5',
                '[&.ant-input-outlined]:bg-white! [&.ant-input-outlined]:hover:bg-white!'
              )}
              placeholder="Enter title..."
              rows={1}
              maxLength={maxNameLength}
              autoSize
            />
          </Form.Item>
        ) : (
          <div
            className={cn(
              'text-lg leading-tight line-clamp-3 relative flex items-start justify-between',
              'font-bold text-primary-9 transition-all duration-300 lg:text-xl 2xl:text-3xl'
            )}
          >
            <span className="pr-1.5">{isPending ? variables?.name : result.data.project.name}</span>
            {mounted && isVirtualLabAdmin && (
              <Button
                rounded
                size="sm"
                variant="icon"
                type="button"
                onClick={handleEdit}
                className={cn(
                  'transform border border-neutral-2 p-0.5 bg-white/20 transition-all duration-200',
                  'mb-0.5 hover:bg-white hover:shadow-sm ml-auto flex items-center justify-center'
                )}
                aria-label="edit project details"
                disabled={!isVirtualLabAdmin}
              >
                <RiEditBoxLine className="text-primary-8 size-3.5" />
              </Button>
            )}
          </div>
        )}

        {isEditing ? (
          <Form.Item
            name="description"
            initialValue={result.data.project.description}
            rules={[
              {
                max: maxDescriptionLength,
                message: 'Description must be less than 600 characters',
              },
            ]}
          >
            <Input.TextArea
              id="project-description"
              className={cn(
                'w-full resize-y rounded-lg border border-neutral-2 p-2 text-sm font-light',
                'text-primary-9 placeholder-white/60 backdrop-blur-sm transition-all ',
                'duration-300 placeholder:text-sm lg:text-lg focus-within:shadow-none focus-within:border-primary-5',
                '[&.ant-input-outlined]:bg-white! [&.ant-input-outlined]:hover:bg-white!'
              )}
              placeholder="Enter description..."
              rows={4}
              maxLength={maxDescriptionLength}
              autoSize={{ minRows: 4, maxRows: 10 }}
            />
          </Form.Item>
        ) : (
          <ExpandableText
            id="project-description-text"
            text={isPending ? variables?.description : result.data.project.description}
            collapsedLines={4}
            className={cn(
              'text-left text-balance wrap-break-word hyphens-manual text-base',
              'leading-6 text-neutral-4 transition-all duration-300 2xl:text-lg'
            )}
          >
            {({ isExpanded, toggle }) => (
              <button
                type="button"
                onClick={toggle}
                aria-controls="project-description-less-more"
                className={cn(
                  'text-neutral-4 underline decoration-white/40 underline-offset-4 ',
                  'transition-colors hover:text-primary-8 text-sm'
                )}
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </ExpandableText>
        )}
        <div className="relative flex justify-end gap-2 ml-auto mb-0.5">
          {isEditing && (
            <>
              <Button
                rounded
                size="md"
                type="reset"
                variant="ghost"
                aria-label="revert changes"
                onClick={onCancel}
                className={cn(
                  'transform transition-all duration-200 disabled:opacity-50',
                  'hover:bg-white hover:text-primary-8 bg-gray-100'
                )}
              >
                Cancel
              </Button>
              <Button
                size="md"
                variant="outline"
                aria-label="submit changes"
                disabled={isPending || !isFormValid}
                onClick={() => form.submit()}
                className={cn(
                  'transform bg-white font-bold shadow-sm rounded-full disabled:opacity-50',
                  'text-primary-8 hover:border-primary-8 hover:bg-primary-8 hover:text-white '
                )}
              >
                {isPending ? <LoadingOutlined spin /> : <span>Save</span>}
              </Button>
            </>
          )}
        </div>
      </div>
    </Form>
  );
}
