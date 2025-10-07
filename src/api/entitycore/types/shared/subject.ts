import { z } from 'zod';
import isNil from 'lodash/isNil';

import { AgePeriodEnum, SexEnum } from '@/api/entitycore/types/shared/global';
import type {
  ContributionFilter,
  IDFilter,
  OwnershipFilter,
  PaginationFilter,
  SearchFilter,
  SpeciesFilter,
} from '@/api/entitycore/types/shared/request';

export interface ISubjectFilter
  extends PaginationFilter,
    OwnershipFilter,
    SpeciesFilter,
    IDFilter,
    SearchFilter,
    ContributionFilter {
  age_value: string | null;
}

export const SubjectBaseSchema = z.object({
  name: z
    .string({
      error: 'Subject name is required',
    })
    .nonempty({
      error: 'Subject name is required',
    }),
  description: z
    .string({
      error: 'Subject description is required',
    })
    .nonempty({
      error: 'Subject description is required',
    }),
  sex: SexEnum,
  weight: z.number().positive().nullish(),
  age_value: z.number().positive().nullish(),
  age_min: z.number().positive().nullish(),
  age_max: z.number().positive().nullish(),
  age_period: AgePeriodEnum.optional(),
});

export const SubjectCreateSchema = SubjectBaseSchema.extend({
  authorized_public: z.boolean().prefault(false),
  species_id: z.uuid().nonempty({
    error: 'Species is required',
  }),
  strain_id: z.uuid().nullable().optional(),
}).superRefine((data, ctx) => {
  if ((data.age_value || !isNil(data.age_min) || !isNil(data.age_max)) && !data.age_period) {
    ctx.addIssue({
      code: 'custom',
      message: 'Age period must be provided when age fields are provided',
      path: ['age_period'],
    });
  }

  if (data.age_value && (!isNil(data.age_min) || !isNil(data.age_max))) {
    ctx.addIssue({
      code: 'custom',
      message: 'Age value and age min/max cannot both be provided',
      path: ['age_value'],
    });
  }

  if (!isNil(data.age_max) && !isNil(data.age_min) && data.age_min >= data.age_max) {
    ctx.addIssue({
      code: 'custom',
      message: 'Age min must be less than age max',
      path: ['age_min'],
    });
  }

  if (!isNil(data.age_max) && !isNil(data.age_min) && data.age_max <= data.age_min) {
    ctx.addIssue({
      code: 'custom',
      message: 'Age max must be greater than age min',
      path: ['age_max'],
    });
  }

  if (
    isNil(data.age_value) &&
    ((!isNil(data.age_min) && isNil(data.age_max)) || (isNil(data.age_min) && !isNil(data.age_max)))
  ) {
    ctx.addIssue({
      code: 'custom',
      message: 'Age min and age max must be provided together',
    });
  }
});

export type TSubjectCreate = z.infer<typeof SubjectCreateSchema>;
