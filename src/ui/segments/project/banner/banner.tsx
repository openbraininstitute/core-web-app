'use client';

import { CheckOutlined, CloseOutlined, EditOutlined, LoadingOutlined } from '@ant-design/icons';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { useRef, useState, useEffect, type ReactElement } from 'react';
import { motion, transform, useAnimate } from 'motion/react';
import { Form, Input, type FormProps } from 'antd';
import { z } from 'zod';
import delay from 'es-toolkit/compat/delay';
import Image from 'next/image';
import get from 'es-toolkit/compat/get';

import { getProject, updateProject } from '@/api/virtual-lab-svc/queries/project';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { ExpandableText } from '@/ui/molecules/more-less-text';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button/index';
import { cn } from '@/utils/css-class';

type TCardContent = {
  name: string;
  description: string;
};

const projectFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(600, 'Name must be less than 600 characters'),
  description: z.string().min(1, 'Description is required'),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

export function ProjectCard(): ReactElement {
  const { virtualLabId, projectId } = useWorkspace();
  const [form] = Form.useForm<ProjectFormValues>();

  const { data: result, refetch } = useSuspenseQuery({
    queryKey: keyBuilder.getWorkspace({ virtualLabId, projectId }),
    queryFn: () => getProject({ virtualLabId, projectId }),
  });

  const { isVirtualLabAdmin } = useUserPermissions({ virtualLabId, projectId });
  const [isEditing, setIsEditing] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const nameRef = useRef<any>(null);

  const maxNameLength = 60;
  const nameValue = Form.useWatch('name', form) || '';
  const nameCharactersRemaining = maxNameLength - nameValue.length;
  const [nameCounterRef, animateName] = useAnimate();

  const mapNameRemainingToColor = transform([10, 20], ['#e7000b', '#ffffff']);

  useEffect(() => {
    if (!isEditing || nameCharactersRemaining > 20) return;
    const mapRemainingToSpringVelocity = transform([0, 20], [50, 0]);

    animateName(
      nameCounterRef.current,
      { scale: 1 },
      {
        type: 'spring',
        velocity: mapRemainingToSpringVelocity(nameCharactersRemaining),
        stiffness: 700,
        damping: 80,
      }
    );
  }, [animateName, nameCharactersRemaining, isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  const maxDescriptionLength = 600;
  const descriptionValue = Form.useWatch('description', form) || '';
  const descriptionCharactersRemaining = maxDescriptionLength - descriptionValue.length;
  const [descriptionCounterRef, animateDescription] = useAnimate();

  const mapDescriptionRemainingToColor = transform([50, 150], ['#e7000b', '#ffffff']);

  useEffect(() => {
    if (!isEditing || descriptionCharactersRemaining > 150) return;
    const mapRemainingToSpringVelocity = transform([0, 100], [50, 0]);

    animateDescription(
      descriptionCounterRef.current,
      { scale: 1 },
      {
        type: 'spring',
        velocity: mapRemainingToSpringVelocity(descriptionCharactersRemaining),
        stiffness: 700,
        damping: 80,
      }
    );
  }, [animateDescription, descriptionCharactersRemaining, isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  const { mutateAsync, isPending, variables } = useMutation({
    mutationFn: (payload: TCardContent) =>
      updateProject({
        virtualLabId,
        projectId,
        payload,
      }),

    onSettled: () => {
      refetch();
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
        'relative min-h-[18rem] w-full overflow-hidden rounded-2xl',
        '[&_.ant-form-item-explain-error]:text-sm!'
      )}
      style={{
        background: 'linear-gradient(95.23deg, #0050B3 18.61%, #69C0FF 103.56%)',
      }}
    >
      <div className="absolute top-6 right-6 z-20 flex gap-2">
        {isEditing ? (
          <>
            <Button
              rounded
              size="md"
              variant="icon"
              aria-label="submit changes"
              disabled={isPending || !isFormValid}
              onClick={() => form.submit()}
              className="transform bg-green-500/80 transition-all duration-200 hover:scale-105 hover:bg-green-500 disabled:opacity-50"
            >
              {isPending ? <LoadingOutlined spin /> : <CheckOutlined className="text-white" />}
            </Button>
            <Button
              rounded
              size="md"
              type="reset"
              variant="icon"
              aria-label="revert changes"
              onClick={onCancel}
              className="transform bg-red-500/80 transition-all duration-200 hover:scale-105 hover:bg-red-500 disabled:opacity-50"
            >
              <CloseOutlined className="text-white" />
            </Button>
          </>
        ) : (
          isVirtualLabAdmin && (
            <Button
              rounded
              size="md"
              variant="icon"
              type="button"
              onClick={handleEdit}
              className="transform bg-white/20 transition-all duration-200 hover:scale-105 hover:bg-white/30"
              aria-label="edit project details"
              disabled={!isVirtualLabAdmin}
            >
              <EditOutlined className="text-white" />
            </Button>
          )
        )}
      </div>

      <div className="absolute top-0 right-0 z-10">
        <Image
          src="/images/thalamus-project-card.png"
          alt="3D Thalamus reconstruction showing different anatomical regions in various colors"
          width={600}
          height={400}
          className="h-auto max-w-[300px] object-contain lg:max-w-[400px] xl:max-w-[500px]"
          priority
        />
      </div>

      <div className="relative z-10 h-full w-full">
        <div className="h-full w-full p-6 md:w-[calc(100%-6px)] md:pt-20 lg:p-6 lg:md:w-[calc(var(--container-2xl)-14px)] xl:max-w-3xl">
          <div className="mb-2 lg:mb-6">
            {isEditing ? (
              <div className="relative">
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
                      'w-full resize-none rounded-lg border border-white/20 p-3 text-lg font-bold text-white placeholder-white/60 backdrop-blur-sm transition-all duration-300',
                      'min-h-auto placeholder:text-sm hover:bg-transparent! focus:bg-white/15 focus:ring-1 focus:ring-white/30 focus:outline-none lg:text-xl',
                      '[&.ant-input-outlined]:bg-transparent! [&.ant-input-outlined]:hover:bg-transparent!'
                    )}
                    placeholder="Enter title..."
                    rows={1}
                    maxLength={maxNameLength}
                    autoSize
                  />
                </Form.Item>
                <div
                  className={cn(
                    'pointer-events-none absolute top-1 right-1 flex size-9',
                    'items-center justify-center rounded-full bg-white/30 backdrop-blur-md'
                  )}
                >
                  <motion.span
                    ref={nameCounterRef}
                    style={{
                      color: mapNameRemainingToColor(nameCharactersRemaining),
                      willChange: 'transform',
                      display: 'inline-block',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
                    }}
                  >
                    {nameCharactersRemaining}
                  </motion.span>
                </div>
              </div>
            ) : (
              <h1 className="text-xl leading-tight font-bold text-white transition-all duration-300 lg:text-2xl xl:text-3xl">
                {isPending ? variables?.name : result.data.project.name}
              </h1>
            )}
          </div>

          <div>
            {isEditing ? (
              <div className="relative">
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
                      'w-full resize-y rounded-lg border border-white/20 p-2 text-base text-white/90 placeholder-white/60 backdrop-blur-sm',
                      'transition-all duration-300 placeholder:text-sm focus:bg-white/15 focus:ring-1 focus:ring-white/30 focus:outline-none lg:text-lg',
                      '[&.ant-input-outlined]:bg-transparent! [&.ant-input-outlined]:hover:bg-transparent!'
                    )}
                    placeholder="Enter description..."
                    rows={4}
                    maxLength={maxDescriptionLength}
                    autoSize={{ minRows: 4, maxRows: 10 }}
                  />
                </Form.Item>
                <div
                  className={cn(
                    'pointer-events-none absolute top-1 right-1 flex size-9',
                    'items-center justify-center rounded-full bg-white/30 backdrop-blur-md'
                  )}
                >
                  <motion.span
                    ref={descriptionCounterRef}
                    style={{
                      color: mapDescriptionRemainingToColor(descriptionCharactersRemaining),
                      willChange: 'transform',
                      display: 'inline-block',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
                    }}
                  >
                    {descriptionCharactersRemaining}
                  </motion.span>
                </div>
              </div>
            ) : (
              <ExpandableText
                id="project-description-text"
                text={isPending ? variables?.description : result.data.project.description}
                collapsedLines={6}
                className="text-justify text-base leading-6 text-white/90 transition-all duration-300 lg:text-lg"
              >
                {({ isExpanded, toggle }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    aria-controls="project-description-less-more"
                    className={cn(
                      'text-white/90 underline decoration-white/40 underline-offset-4 transition-colors hover:text-white',
                      'text-sm'
                    )}
                  >
                    {isExpanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </ExpandableText>
            )}
          </div>
        </div>
      </div>
    </Form>
  );
}
