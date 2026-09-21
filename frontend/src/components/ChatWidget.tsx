import { useState } from "react";
import { MessageCircle, X, ArrowLeft } from "lucide-react";
import { contacts, type Contact } from "../data/contacts";
import { surfaceBackground, borderColor } from "../styles/tokens";

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg"
      >
        <MessageCircle size={24} />
      </button>
    );
  }

  return (
    <div
      className={
        surfaceBackground +
        " " +
        borderColor +
        " fixed bottom-6 right-6 w-80 h-96 border rounded-lg shadow-lg flex flex-col"
      }
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <span className="text-white font-semibold">
          {selectedContact ? selectedContact.name : "Messages"}
        </span>
        <button onClick={() => setIsOpen(false)}>
          <X size={18} className="text-gray-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {selectedContact ? (
          <div className="flex flex-col h-full">
            <button
              onClick={() => setSelectedContact(null)}
              className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white text-sm"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
              Conversation with {selectedContact.name} coming soon.
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            {contacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800 text-left"
              >
                <img
                  src={contact.avatar}
                  alt={contact.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="flex-1">
                  <p className="text-white text-sm">{contact.name}</p>
                </div>
                <span
                  className={
                    "w-2 h-2 rounded-full " +
                    (contact.online ? "bg-green-500" : "bg-gray-500")
                  }
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatWidget;
