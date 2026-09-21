import { cardStyle } from "../styles/tokens";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

function Modal({ isOpen, onClose, children }: ModalProps) {
  if (!isOpen) {
    return null;
  }
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/50 flex items-center justify-center"
    >
      <div className={cardStyle} onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export default Modal;
