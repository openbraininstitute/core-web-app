type Props = {
  visible: boolean;
  children: React.ReactNode;
};

/**
 * A wrapper component that controls visibility without unmounting children.
 * This preserves component state and prevents refetching data.
 */
export default function VisibilityWrapper({ visible, children }: Props) {
  return (
    <div
      className={`w-full transition-opacity duration-200 ${
        visible ? 'relative opacity-100' : 'pointer-events-none absolute opacity-0'
      }`}
    >
      {children}
    </div>
  );
}
