export default function SubtitleBar({
    title
}:{
    title: string;
}) {

    return (
        <div className="relative w-full flex flex-row px-6 py-4 bg-gray-100 text-primary-8 text-xl font-bold mb-8 mt-20">
            {
                title
            }
        </div>
    )
}