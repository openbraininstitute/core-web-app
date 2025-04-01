export default function ParameterBox({
    name,
    value,
}:{
    name: string;
    value: string | number;
}) {
    return (
        <div className="relativee w-full flex flex-col">
            <div className="font-light text-sm uppercase tracking-wider text-gray-500">
                {name}
            </div>
            <div className="font-normal text-xl text-primary-9">
                {value}
            </div>
        </div>
    )
}