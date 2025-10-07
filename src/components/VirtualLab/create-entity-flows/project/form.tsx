'use client';

import { useMemo, useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { Form, ConfigProvider, Button } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useAtomValue, useSetAtom } from 'jotai';
import { useSession } from 'next-auth/react';
import { unwrap } from 'jotai/utils';

import uniqBy from 'es-toolkit/compat/uniqBy';
import reject from 'es-toolkit/compat/reject';
import find from 'es-toolkit/compat/find';
import VirtualLabsList from '@/components/VirtualLab/create-entity-flows/project/vlabs-list';
import Overview from '@/components/VirtualLab/create-entity-flows/project/overview';
import Footer from '@/components/VirtualLab/create-entity-flows/project/footer';

import type {
  ProjectFlowSteps,
  ProjectFlowStepsArray,
} from '@/components/VirtualLab/create-entity-flows/common/types';
import {
  useFilteredMembers,
  AddMembers,
} from '@/components/VirtualLab/create-entity-flows/project/add-members';
import { Input } from '@/components/VirtualLab/create-entity-flows/common/inputs';
import { virtualLabProjectsAtomFamily } from '@/state/virtual-lab/projects';
import { virtualLabDetailAtomFamily, virtualLabMembersAtomFamily } from '@/state/virtual-lab/lab';
import { createProject } from '@/api/virtual-lab-svc/queries/project';
import { generateVlProjectUrl } from '@/util/virtual-lab/urls';
import { Member, Role } from '@/api/virtual-lab-svc/queries/types';
import { useAppNotification } from '@/components/notification';
import { ProjectPayload } from '@/api/virtual-lab-svc/types';
import { classNames } from '@/util/utils';
import { tryCatch } from '@/api/utils';

type Props = {
  step: ProjectFlowSteps;
  steps: ProjectFlowStepsArray;
  onCancel: () => void;
  onStepChange: (t: ProjectFlowSteps) => void;
};

export default function CreationForm({ step, steps, onCancel, onStepChange }: Props) {
  const { success: notifySuccess, error: notifyError } = useAppNotification();
  const { data } = useSession();

  const { push: navigate } = useRouter();
  const [form] = Form.useForm<ProjectPayload & { virtual_lab_id: string }>();
  const [pending, startTransition] = useTransition();
  const [isFormValid, setIsFormValid] = useState(false);
  const [searchQuery, setSearchValue] = useState('');
  const [slideDirection, onSlideDirectionChange] = useState<'right' | 'left'>('right');
  const { virtualLabId } = useParams<{ virtualLabId: string }>();
  const fields = Form.useWatch([], form);
  const refreshProjects = useSetAtom(
    virtualLabProjectsAtomFamily({ virtualLabId, page: 1, size: 20 })
  );
  const disableNextProject = !!find(steps, { id: 'virtual-lab' }) && !fields?.virtual_lab_id;
  const disableNextMembers = !isFormValid || !fields?.name;

  const usersAtom = virtualLabMembersAtomFamily(virtualLabId);
  const result = useAtomValue(useMemo(() => unwrap(usersAtom), [usersAtom]));

  const users = reject(
    result?.data?.users,
    (user) =>
      user.id === result?.data?.owner_id ||
      user.id === data?.user.id ||
      user.invite_accepted === false
  );

  const filteredUsers = useFilteredMembers(users, searchQuery);
  const [membersList, updateMembersList] = useState<Array<Member>>([]);
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const onNextStep = () => {
    onSlideDirectionChange('left');
    const currentIndex = steps.findIndex((s) => s.id === step);
    if (currentIndex < steps.length - 1) {
      onStepChange(steps[currentIndex + 1].id);
    }
  };

  const onPreviousStep = () => {
    onSlideDirectionChange('right');
    const currentIndex = steps.findIndex((s) => s.id === step);
    if (currentIndex > 0) {
      onStepChange(steps[currentIndex - 1].id);
    }
  };

  const onValuesChange = () => {
    form
      .validateFields()
      .then(() => {
        setIsFormValid(true);
      })
      .catch((error) => {
        if (error.errorFields.length > 0) {
          setIsFormValid(false);
        } else {
          setIsFormValid(true);
        }
      });
  };

  const onFormSubmit = async (values: ProjectPayload & { virtual_lab_id: string }) => {
    const id = virtualLabId ?? values.virtual_lab_id;

    startTransition(async () => {
      const formValues = {
        ...values,
        include_members: uniqBy(
          membersList.map((member) => ({
            id: member.id,
            email: member.email,
            role: member.role,
          })),
          'id'
        ),
      };
      const { data: resultCreation, error } = await tryCatch(createProject(id, formValues));
      if (error || !resultCreation || !resultCreation.data) {
        notifyError({
          message: 'Project creation failed. Please check your details and try again.',
          placement: 'topRight',
        });
      }
      if (resultCreation && resultCreation.data) {
        notifySuccess({
          message: `Your Project ${values.name} has been created successfully and is now ready to use.`,
          placement: 'topRight',
        });
        refreshProjects();
        virtualLabDetailAtomFamily.remove(virtualLabId);
        navigate(`${generateVlProjectUrl(id, resultCreation.data.project.id)}/home`);
      }
    });
  };

  const onSelectUser = (record: Member) => (e: CheckboxChangeEvent) => {
    const { checked } = e.target;
    if (checked) {
      updateMembersList((prev) => [...prev, record]);
    } else {
      const filteredList = reject(membersList, { id: record.id });
      updateMembersList(filteredList);
    }
  };

  const handleSearchClick = () => {
    setIsSearchVisible((prev) => !prev);
    if (isSearchVisible) {
      setSearchValue('');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  const onRoleChange = (record: Member, role: Role) => {
    updateMembersList((prev) => {
      const existingMember = find(prev, { id: record.id });
      if (existingMember) {
        return prev.map((member) =>
          member.id === existingMember.id ? { ...member, role } : member
        );
      }
      return [...prev, { ...record, role }];
    });
  };

  return (
    <ConfigProvider theme={{ hashed: false }}>
      <Form
        name="project-creation-flow"
        form={form}
        layout="vertical"
        onFinish={onFormSubmit}
        className="flex h-full grow flex-col p-2"
        requiredMark={false}
        validateTrigger={['onChange']}
        initialValues={{
          name: '',
          description: '',
          include_members: [],
        }}
        onValuesChange={onValuesChange}
        disabled={pending}
      >
        <AnimatePresence initial={false} custom={slideDirection} mode="wait">
          <motion.div
            key={step}
            custom={slideDirection}
            variants={{
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              exit: { opacity: 0 },
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              duration: 0.3,
              type: 'tween',
              ease: 'easeInOut',
            }}
            className="relative flex h-full grow flex-col"
          >
            {virtualLabId && (
              <Form.Item hidden name="virtual_lab_id">
                <input name="virtual_lab_id" type="text" value={virtualLabId} hidden />
              </Form.Item>
            )}

            {Boolean(steps.find((o) => o.id === 'virtual-lab')?.id) && (
              <div className={step !== 'virtual-lab' ? 'hidden' : ''}>
                <VirtualLabsList />
              </div>
            )}
            <div className={step !== 'information' ? 'hidden' : ''}>
              <Overview />
            </div>
            <div className={step !== 'members' ? 'hidden' : ''}>
              <div className="mx-auto mt-10 w-full max-w-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <h1 className="text-primary-8 text-xl font-bold">Add new members to project</h1>
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="Search members..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      className={classNames(
                        'transition-all duration-300 ease-in-out',
                        isSearchVisible ? 'w-60 opacity-100' : 'w-0 opacity-0'
                      )}
                      style={{ visibility: isSearchVisible ? 'visible' : 'hidden' }}
                      disabled={!users.length || pending}
                    />
                    <Button
                      type="text"
                      icon={<SearchOutlined className="text-primary-8 text-xl" />}
                      onClick={handleSearchClick}
                      className="!p-1"
                      disabled={!users.length || pending}
                    />
                  </div>
                </div>

                <div className="flex h-full flex-grow flex-col rounded-lg bg-white">
                  <div
                    data-testid="all-users-list"
                    className="mx-auto h-full w-full max-w-5xl flex-grow bg-white"
                  >
                    <div className="secondary-scrollbar flex h-[450px] flex-grow flex-col overflow-y-auto">
                      <div className="w-full pr-4">
                        <AddMembers
                          query={searchQuery}
                          users={filteredUsers}
                          selectedMembers={membersList}
                          onSelect={onSelectUser}
                          onRoleChange={onRoleChange}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
        <div className="mx-auto mt-auto w-full max-w-5xl px-4 lg:max-w-full">
          <div className="px-4 py-4">
            <Footer
              {...{
                step,
                steps,
                onCancel,
                onNextStep,
                onPreviousStep,
                disableNextProject,
                disableNextMembers,
                loading: pending,
                disableCreate: !isFormValid || pending,
              }}
            />
          </div>
        </div>
      </Form>
    </ConfigProvider>
  );
}
