import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { Field } from '@/ui/segments/detail-view/overview/field';
import { cn } from '@/utils/css-class';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';

const columnFields: { field: EntityCoreFields; target: 'subject' | 'entity' }[][] = [
  [
    { field: EntityCoreFields.Name, target: 'subject' },
    { field: EntityCoreFields.Description, target: 'subject' },
  ],
  [
    { field: EntityCoreFields.SpeciesName, target: 'entity' },
    { field: EntityCoreFields.SubjectStrainName, target: 'entity' },
    { field: EntityCoreFields.SubjectSex, target: 'entity' },
    { field: EntityCoreFields.SubjectWeight, target: 'entity' },
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
  className,
}: {
  entity: EntityCoreObjectTypes;
  className?: string;
}) {
  return (
    <div className={cn('mb-5 rounded-lg border border-gray-300 p-5', className)}>
      <h2 className="text-primary-8 text-xl font-bold">Subject</h2>

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
                data={target === 'subject' && 'subject' in entity ? entity.subject : entity}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
