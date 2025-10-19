export default function PointBalance({
  balance,
}) {
  return (
    <div className="absolute z-10 top-4 right-4 bg-white text-black px-4 py-2 rounded-lg shadow-lg border border-gray-200 font-semibold">
      Score: {balance}
    </div>
  )
}