export default function MEModelHeaderTable() {
  return (
    <div className="text-neutral-4 relative mb-8 flex w-full flex-row items-center text-sm tracking-wider uppercase">
      <div className="w-[350px]">Name</div>
      <div className="w-[116px]">Morphology</div>
      <div className="w-[116px]">Trace</div>
      <div className="w-24">Validated</div>
      <div className="w-[200px]">Brain Region</div>
      <div className="w-28">M-type</div>
      <div className="w-28">E-type</div>
    </div>
  );
}
