import { useStoreOpen } from "@/hooks/useStoreOpen";

interface Props {
  textColor?: string;
  className?: string;
}

const StoreStatusBadge = ({ textColor, className = "" }: Props) => {
  const { loading, isOpen, status } = useStoreOpen();
  if (loading) return null;

  return (
    <div
      className={`flex items-center justify-center gap-2 ${className}`}
      style={{ color: textColor }}
    >
      <span
        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          isOpen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }`}
      >
        {isOpen ? "Aberto" : "Fechado"}
      </span>
      <span className="text-xs opacity-90">{status.label}</span>
    </div>
  );
};

export default StoreStatusBadge;
