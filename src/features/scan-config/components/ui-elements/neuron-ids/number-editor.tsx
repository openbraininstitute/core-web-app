import Editor, { type OnChange, type OnMount } from '@monaco-editor/react';
import dynamic from 'next/dynamic';
import { useRef } from 'react';

import type * as monaco from 'monaco-editor';

function NumberEditor({
  value,
  setValue,
  setIsTextValid,
  disabled,
}: {
  value: string;
  setIsTextValid: (v: boolean) => void;
  setValue: (newV: string) => void;
  disabled: boolean;
}) {
  const monacoRef = useRef<typeof monaco | null>(null);

  const validate = (
    content: string,
    model: monaco.editor.ITextModel | null,
    monacoInstance: typeof monaco
  ): void => {
    if (!model) return;

    const markers: monaco.editor.IMarkerData[] = [];
    const invalidTokenPattern = /(?<=^|[,\n\r])[^,\n\r]*?([^0-9,\n\r ]|[0-9] +[0-9])[^,\n\r]*/g;

    const matches = content.matchAll(invalidTokenPattern);

    for (const match of matches) {
      const fullMatch = match[0];
      const capturedGroup = match[1];

      if (!capturedGroup) continue;

      const offset = fullMatch.indexOf(capturedGroup);
      const startIdx = (match.index ?? 0) + offset;
      const endIdx = startIdx + capturedGroup.length;

      const startPos = model.getPositionAt(startIdx);
      const endPos = model.getPositionAt(endIdx);

      markers.push({
        severity: monacoInstance.MarkerSeverity.Error,
        startLineNumber: startPos.lineNumber,
        startColumn: startPos.column,
        endLineNumber: endPos.lineNumber,
        endColumn: endPos.column,
        message: `"${capturedGroup}" is not a valid integer.`,
      });
    }

    if (markers.length === 0) {
      setIsTextValid(true);
    } else {
      setIsTextValid(false);
    }

    monacoInstance.editor.setModelMarkers(model, 'number-validator', markers);
  };

  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    monacoRef.current = monacoInstance;
    validate(value, editor.getModel(), monacoInstance);
  };

  const handleEditorChange: OnChange = (newValue) => {
    const val = newValue ?? '';
    setValue(val);

    if (monacoRef.current) {
      const model = monacoRef.current.editor.getModels()[0];
      validate(val, model, monacoRef.current);
    }
  };

  return (
    <div style={{ height: 350, width: '100%' }}>
      <Editor
        height="100%"
        defaultLanguage="plaintext"
        theme="vs-light"
        value={value}
        onMount={handleEditorDidMount}
        onChange={handleEditorChange}
        options={{
          lineNumbers: 'on',
          wordWrap: 'on',
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 12,
          padding: { top: 12, bottom: 12 },
          lineNumbersMinChars: 3,
          lineDecorationsWidth: 0,
          readOnly: disabled,
          automaticLayout: true,
        }}
      />
    </div>
  );
}

export default dynamic(() => Promise.resolve(NumberEditor), {
  ssr: false,
});
