'use client';

import { useEffect, useRef, useState, MouseEvent, useCallback, type JSX } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  AppstoreOutlined,
  DeleteOutlined,
  EnterOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import delay from 'lodash/delay';
import last from 'lodash/last';
import startCase from 'lodash/startCase';
import reject from 'lodash/reject';

import { useContextSearchParams, useLiteratureDataSource } from '../useContextualLiteratureContext';
import { classNames } from '@/util/utils';
import {
  literatureAtom,
  literatureResultAtom,
  useLiteratureAtom,
  persistedLiteratureResultAtom,
} from '@/state/literature';
import { GenerativeQA, SucceededGenerativeQA } from '@/types/literature';
import { brainRegionSidebarIsCollapsedAtom } from '@/state/brain-regions';

type QAHistoryNavigationItemProps = Pick<
  GenerativeQA,
  'id' | 'question' | 'askedAt' | 'brainRegion' | 'isNotFound'
> &
  Pick<SucceededGenerativeQA, 'extra'> & {
    index: number;
    showExpandedView: boolean;
  };

function IndicationIcon({
  title,
  icon,
  isActive,
}: {
  title: string;
  icon: JSX.Element;
  isActive?: boolean;
}) {
  return (
    <div
      className={classNames(
        'my-1 inline-flex items-center gap-2',
        isActive ? 'text-primary-5' : 'text-gray-400'
      )}
    >
      {icon}
      <span
        title={title}
        className={classNames(
          'line-clamp-1 text-base',
          isActive ? 'text-primary-5' : 'text-gray-400'
        )}
      >
        {title}
      </span>
    </div>
  );
}

function QAHistoryNavigationItem({
  id,
  index,
  question,
  isNotFound,
  showExpandedView,
  extra,
}: QAHistoryNavigationItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { activeQuestionId } = useAtomValue(literatureAtom);
  const [QAs, updateResult] = useAtom(literatureResultAtom);
  const updatePersistedResults = useSetAtom(persistedLiteratureResultAtom);
  const update = useLiteratureAtom();
  const { isBuildSection } = useContextSearchParams();

  const isActive = activeQuestionId === id;

  const onClick = () => update('activeQuestionId', id);
  const onDelete = (e: MouseEvent<HTMLSpanElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleting(true);
    delay(() => {
      updatePersistedResults((PQAs) => reject(PQAs, { id }));
      updateResult((PQAs) => reject(PQAs, { id }));
      setIsDeleting(false);
      update('activeQuestionId', QAs ? last(QAs)?.id : null);
    }, 1000);
  };

  const showParameters = extra && (extra.buildStep || extra.DensityOrCount);
  return (
    <a
      href={`#${id}`}
      role="button"
      onClick={onClick}
      className={classNames(
        'gqa-nav-item group text-neutral-8 relative inline-flex cursor-pointer list-none items-center rounded-r-sm py-4 pr-2 first:mt-auto last:mb-auto hover:bg-gray-50',
        isDeleting && 'animate-scale-down overflow-hidden bg-gray-100 py-4',
        isBuildSection ? 'pl-16' : 'pl-7',
        showExpandedView ? 'w-full' : 'w-max'
      )}
    >
      {showExpandedView ? (
        <>
          {isActive && (
            <div
              className={classNames(
                'bg-primary-8 ease-in-expo absolute top-6 inline-flex h-[3.5px] transform rounded-full transition-all duration-200',
                isDeleting && 'hidden',
                isBuildSection ? 'left-3 w-10' : 'left-0 w-4'
              )}
            />
          )}

          <div className="flex w-full flex-col items-start justify-start">
            <div className="inline-flex w-full items-center justify-between gap-2">
              <div className="text-neutral-3 group-hover:text-neutral-4 text-sm font-medium capitalize group-hover:font-bold">
                question {index}
              </div>
              <DeleteOutlined
                className="text-neutral-3 hover:text-primary-8 group-hover:text-primary-8 text-sm hover:scale-110 hover:transform hover:transition-all"
                onClick={onDelete}
              />
            </div>
            {showParameters && (
              <div className="my-2 flex w-3/4 flex-col items-start border-t border-b border-gray-200 py-2">
                {extra && extra.buildStep && (
                  <IndicationIcon
                    icon={<AppstoreOutlined />}
                    title={startCase(extra.buildStep)}
                    isActive={isActive}
                  />
                )}
                {extra && extra.DensityOrCount && (
                  <IndicationIcon
                    icon={<EnterOutlined className="-scale-x-100 scale-y-100" />}
                    title={startCase(extra.DensityOrCount)}
                    isActive={isActive}
                  />
                )}
              </div>
            )}
            <div title={question} className="w-full">
              <div
                data-testid="question-navigation-item"
                className={classNames(
                  'group-hover:text-primary-8 line-clamp-2 w-4/5 text-xl',
                  isNotFound && isActive && 'text-amber-500',
                  isActive ? 'text-primary-8 font-extrabold' : 'text-neutral-3 font-medium'
                )}
              >
                {question}
              </div>
              {isNotFound && (
                <div className="inline-flex items-center justify-start">
                  <WarningOutlined className="mr-2 text-orange-300" />
                  <span className="font-light text-amber-500">No Answer available</span>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div
          title={question}
          className={classNames(
            'h-[8px] w-[8px] rounded-full',
            isActive ? 'bg-primary-8' : 'bg-gray-300'
          )}
          data-testid="minimal-question-item"
        />
      )}
    </a>
  );
}

function QAHistoryNavigation() {
  const update = useLiteratureAtom();
  const showExpandedView = useAtomValue(brainRegionSidebarIsCollapsedAtom);
  const firstRenderRef = useRef(false);
  const dataSource = useLiteratureDataSource();
  const { isBuildSection, isContextualLiterature } = useContextSearchParams();

  const showNavigation = isContextualLiterature ? true : dataSource.length > 1;

  useEffect(() => {
    // set the active question to the last question just in the first reneder
    if (dataSource.length > 0 && !firstRenderRef.current) {
      update('activeQuestionId', dataSource[dataSource.length - 1].id);
      firstRenderRef.current = true;
    }
  }, [dataSource, update, firstRenderRef]);

  const qaNavigationRef = useCallback(
    (node: HTMLElement) => {
      if (node && dataSource.length) {
        node.scrollTo({
          behavior: 'auto',
          top: node.scrollHeight,
        });
      }
    },
    [dataSource]
  );

  if (!showNavigation) return null;

  return (
    <nav
      ref={qaNavigationRef}
      id="gqa-navigation"
      className={classNames(
        'no-scrollbar flex flex-col overflow-x-hidden py-10',
        isBuildSection ? '-ml-10 h-[calc(100%-240px)]' : 'h-[calc(100%-140px)]'
      )}
    >
      {dataSource.map((qa, index) => (
        <QAHistoryNavigationItem
          key={`history-nav-item-${qa.id}`}
          {...{
            index: index + 1,
            id: qa.id,
            askedAt: qa.askedAt,
            question: qa.question,
            isNotFound: qa.isNotFound,
            showExpandedView,
            extra: (qa as SucceededGenerativeQA).extra,
          }}
        />
      ))}
    </nav>
  );
}

export default QAHistoryNavigation;
