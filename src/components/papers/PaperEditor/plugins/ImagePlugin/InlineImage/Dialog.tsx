import { ChangeEventHandler, useCallback, useState } from 'react';
import { Upload, UploadProps, Select, Checkbox, CheckboxProps, Image } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useRouter } from 'next/navigation';
import delay from 'lodash/delay';

import { INSERT_INLINE_IMAGE_COMMAND } from '../utils';
import {
  Position,
  UploadFileMetadata,
  UploaderGenerator,
  UploaderGeneratorResponse,
} from '@/components/papers/uploader/types';
import { getImageDimensions, getRcFileImageUrl } from '@/components/papers/uploader/utils';
import { Distribution } from '@/types/nexus';
import { classNames } from '@/util/utils';
import { Actions } from '@/components/papers/uploader/Actions';

type Props = {
  onUpload: UploaderGenerator;
  onClose: () => void;
};

export default function InsertImageDialog({ onClose, onUpload }: Props) {
  const router = useRouter();
  const [editor] = useLexicalComposerContext();
  const [alt, setAlt] = useState('');
  const [name, setName] = useState('');
  const [inline, setInline] = useState<boolean>(false);
  const [position, setPosition] = useState<Position>(undefined);
  const [image, setImage] = useState<UploadFileMetadata | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadtatus] = useState<UploaderGeneratorResponse>(null);

  const onAltChange: ChangeEventHandler<HTMLInputElement> = (e) => setAlt(e.target.value);
  const onNameChange: ChangeEventHandler<HTMLInputElement> = (e) => setName(e.target.value);
  const onPositionChange = (value: Position) => setPosition(value);
  const onInlineChange: CheckboxProps['onChange'] = (e) => setInline(e.target.checked);

  const beforeUpload: UploadProps['beforeUpload'] = async (file) => {
    const preview = await getRcFileImageUrl(file);
    setImage({ id: crypto.randomUUID(), file, preview, alt });
    return false;
  };

  const uploadCallback = useCallback(
    async (distributions: Array<Distribution>, files: Array<UploadFileMetadata>) => {
      const distribution = distributions[0];
      const file = files[0];
      const dimensions = await getImageDimensions(distribution.contentUrl);

      editor.dispatchCommand(INSERT_INLINE_IMAGE_COMMAND, {
        alt: distribution.name,
        src: distribution.contentUrl,
        position: file.position ?? 'full',
        width: dimensions.width,
        height: dimensions.height,
      });
    },
    [editor]
  );

  const onTriggerUpload = async () => {
    setUploading(true);
    if (image) {
      for await (const value of onUpload(
        [
          {
            ...image,
            name,
            alt,
            position,
          },
        ],
        uploadCallback
      )) {
        if (value?.status === 'success') {
          setUploadtatus(value);
          router.refresh();
          delay(onClose, 1000);
          setUploading(false);
        }
      }
    }
  };

  return (
    <div className="w-full">
      <h1 className="mb-4 text-2xl font-bold text-primary-9">Insert Image</h1>
      <Upload
        withCredentials
        beforeUpload={beforeUpload}
        name="single-image"
        listType="picture"
        className={classNames(
          'w-full',
          '[&_.ant-upload-select]:w-full',
          '[&_.ant-upload-select]:!rounded-md [&_.ant-upload-select]:border-2 [&_.ant-upload-select]:border-dashed [&_.ant-upload-select]:border-gray-300',
          uploadStatus &&
            uploadStatus.source === 'binary' &&
            (uploadStatus.status === 'success'
              ? '[&_.ant-upload-select]:!border-solid [&_.ant-upload-select]:!border-teal-600'
              : '[&_.ant-upload-select]:!border-solid [&_.ant-upload-select]:!border-rose-600')
        )}
        showUploadList={false}
        accept="image/*"
      >
        <div className="relative flex h-36 w-full items-center justify-center">
          {image?.preview && (
            <Image
              key={image.id}
              src={image.preview}
              preview={false}
              rootClassName="w-full h-full  absolute inset-0"
              className="-z-10 !h-full w-full rounded-md object-cover object-center opacity-30"
              alt="gallery thumbnail"
            />
          )}
          <button className="z-10 w-full" type="button">
            <PlusOutlined />
            <div className="mt-2">Click or drag image to this area to upload</div>
          </button>
        </div>
      </Upload>
      <div className="my-3 flex w-full flex-col gap-2">
        <div className="grid grid-cols-[100px_1fr] items-center gap-3">
          <span className="min-w-max font-bold text-primary-8">Name</span>
          <input
            name="name"
            value={name}
            onChange={onNameChange}
            className="w-full rounded-md border border-gray-300 px-4 py-3 text-base"
          />
        </div>
        <div className="grid grid-cols-[100px_1fr] items-center gap-3">
          <span className="min-w-max font-bold text-primary-8">Description</span>
          <input
            name="alt"
            value={alt}
            onChange={onAltChange}
            className="w-full rounded-md border border-gray-300 px-4 py-3 text-base"
          />
        </div>
        <div className="grid h-11 grid-cols-[100px_40px_1fr] items-center gap-3">
          <span className="min-w-max font-bold text-primary-8">Inline Position</span>
          <Checkbox onChange={onInlineChange} />
          {inline && (
            <Select
              size="large"
              defaultValue={undefined}
              value={position}
              onChange={onPositionChange}
              className="max-w-48 [&_.ant-select-selector]:rounded-md"
              options={[
                { value: 'left', label: 'Left' },
                { value: 'right', label: 'Right' },
                { value: 'full', label: 'Full' },
              ]}
            />
          )}
        </div>
      </div>
      <Actions
        {...{
          uploading,
          onTriggerUpload,
          onClose,
        }}
      />
    </div>
  );
}
