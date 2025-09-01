'use client';

import { CheckOutlined, CloseOutlined, EditOutlined, LoadingOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useRef, useState, type ReactElement } from 'react';
import delay from 'lodash/delay';
import Image from 'next/image';
import get from 'lodash/get';

import { getProject, updateProject } from '@/api/virtual-lab-svc/queries/project';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { ExpandableText } from '@/ui/molecules/more-less-text';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button/index';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

type TCardContent = {
  name: string;
  description: string;
};

export function ProjectCard(): ReactElement {
  const { virtualLabId, projectId } = useWorkspace();
  const queryClient = useQueryClient();

  const queryKey = keyBuilder.getOne({ virtualLabId, projectId });
  const { data: result } = useSuspenseQuery({
    queryKey,
    queryFn: () => getProject({ virtualLabId, projectId }),
  });

  const { isAdmin } = useUserPermissions({ virtualLabId, projectId });
  const [isEditing, setIsEditing] = useState(false);
  const nameRef = useRef<HTMLTextAreaElement>(null);

  const { mutateAsync, isPending, variables } = useMutation({
    mutationFn: (payload: TCardContent) =>
      updateProject({
        virtualLabId,
        projectId,
        payload,
      }),

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const onCancel = (_: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    setIsEditing(false);
  };

  const handleEdit = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();
    setIsEditing(true);
    delay(() => {
      nameRef.current?.focus();
    }, 200);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    const newName = String(get(data, 'name', null));
    const newDescription = String(get(data, 'description', null));
    if (newName && newDescription) {
      await mutateAsync({ name: newName, description: newDescription });
    }
    setIsEditing(false);
  };

  return (
    <form
      name="project-form"
      onSubmit={handleSave}
      className="relative min-h-[18rem] w-full overflow-hidden rounded-2xl"
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
              type="submit"
              variant="icon"
              aria-label="submit changes"
              disabled={isPending}
              className="transform bg-green-500/80 transition-all duration-200 hover:scale-105 hover:bg-green-500"
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
              className="transform bg-red-500/80 transition-all duration-200 hover:scale-105 hover:bg-red-500"
            >
              <CloseOutlined className="text-white" />
            </Button>
          </>
        ) : (
          isAdmin && (
            <Button
              rounded
              size="md"
              variant="icon"
              type="button"
              onClick={handleEdit}
              className="transform bg-white/20 transition-all duration-200 hover:scale-105 hover:bg-white/30"
              aria-label="edit project details"
              disabled={!isAdmin}
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
              <textarea
                id="project-name"
                name="name"
                ref={nameRef}
                defaultValue={result.data.project.name}
                className={cn(
                  'w-full resize-none rounded-lg border border-white/20 bg-white/10 p-3 text-lg font-bold text-white placeholder-white/60 backdrop-blur-sm transition-all duration-300',
                  'min-h-auto placeholder:text-sm focus:bg-white/15 focus:ring-1 focus:ring-white/30 focus:outline-none lg:text-xl'
                )}
                placeholder="Enter title..."
                rows={1}
              />
            ) : (
              <h1 className="text-xl leading-tight font-bold text-white transition-all duration-300 lg:text-2xl xl:text-3xl">
                {isPending ? variables.name : result.data.project.name}
              </h1>
            )}
          </div>

          <div>
            {isEditing ? (
              <textarea
                id="project-description"
                name="description"
                defaultValue={result.data.project.description}
                className={cn(
                  'w-full resize-y rounded-lg border border-white/20 bg-white/10 p-2 text-base text-white/90 placeholder-white/60 backdrop-blur-sm',
                  'transition-all duration-300 placeholder:text-sm focus:bg-white/15 focus:ring-1 focus:ring-white/30 focus:outline-none lg:text-lg'
                )}
                placeholder="Enter description..."
                rows={4}
              />
            ) : (
              <ExpandableText
                id="project-description-text"
                text={isPending ? variables.description : result.data.project.description}
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
    </form>
  );
}
