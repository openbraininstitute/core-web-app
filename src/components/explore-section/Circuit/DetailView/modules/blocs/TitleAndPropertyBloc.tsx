export default function TitleAndPropertyBloc({
    title,
    content
}:{
    title: string;
    content: string;
}) {
    return (
        <div className="relative w-full flex flex-col">
            <div className="text-sm text-gray-500 font-light uppercase tracking-wide">
                {
                    title
                }
            </div>
            <p className="text-base text-primary-8 font-normal leading-normal">
                {
                    content
                }
            </p>
        </div>
    )
}