export default function SubtitleBar({
    title
}:{
    title: string;
}) {

    return (
        <div className="relative w-full flex flex-row p-4 bg-primary-8 text-white text-lg font-normal">
            {
                title
            }
        </div>
    )
}