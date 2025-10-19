import {useMemo} from "react";

export default function Loading({
  progress
}) {
  const progressPercentage = useMemo(() => {
    return Math.round(progress * 100);
  }, [progress]);

  return (
    <div className="w-full h-full fixed z-10- top-0 left-0 flex justify-center items-center text-4xl">
      {progressPercentage} %
    </div>
  )
}