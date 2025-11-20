import { getSubject } from '@/api/entitycore/queries/general/subject';
import { EntityCoreObjectTypes } from '@/api/entitycore/types';
import { tryCatch } from '@/api/utils';
import MouseIcon from '@/components/icons/Mouse';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { getQueryClient, HydrateClient } from '@/query-provider/server';
import { Field } from '@/ui/segments/detail-view/overview/field';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { WorkspaceContext } from '@/types/common';
import { cn } from '@/lib/utils';

const columnFields: { field: EntityCoreFields; target: 'subject' | 'entity' }[][] = [
  [
    { field: EntityCoreFields.Name, target: 'subject' },
    { field: EntityCoreFields.Description, target: 'subject' },
    { field: EntityCoreFields.CreationDate, target: 'subject' },
    { field: EntityCoreFields.UpdateDate, target: 'subject' },
  ],
  [
    { field: EntityCoreFields.SubjectSex, target: 'entity' },
    { field: EntityCoreFields.SubjectWeight, target: 'entity' },
    { field: EntityCoreFields.SubjectSpeciesName, target: 'entity' },
  ],
  [
    { field: EntityCoreFields.SubjectAge, target: 'entity' },
    { field: EntityCoreFields.SubjectAgeMin, target: 'entity' },
    { field: EntityCoreFields.SubjectAgeMax, target: 'entity' },
    { field: EntityCoreFields.SubjectAgePeriod, target: 'entity' },
  ],
];

export default async function SubjectDetails({
  entity,
  subjectId,
  ctx,
  className,
}: {
  entity: EntityCoreObjectTypes;
  subjectId: string;
  ctx: WorkspaceContext;
  className?: string;
}) {
  const queryClient = getQueryClient();

  const { data: subject, error } = await tryCatch(
    queryClient.fetchQuery({
      queryKey: keyBuilder.subject(ctx),
      queryFn: () => getSubject({ id: subjectId, context: ctx }),
    })
  );

  if (!subject || error) return <div>Failed to load subject information</div>;

  return (
    <HydrateClient>
      <div className={cn('mb-5 rounded-lg border border-gray-300 p-5', className)}>
        <h2 className="text-primary-8 text-xl font-bold">
          <MouseIcon className="mr-2 inline-block" /> Subject
        </h2>

        <div className="flex flex-row flex-wrap">
          {columnFields.map((fields) => (
            <div
              key={fields[0].field}
              className="mt-8 basis-full sm:not-first:basis-1/2 sm:first:basis-full lg:!basis-1/3"
            >
              {fields.map(({ field, target }) => (
                <Field
                  key={field}
                  className="not-first:mt-4"
                  field={field}
                  data={target === 'subject' ? subject : entity}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </HydrateClient>
  );
}
