import { contacts } from "../data/contacts";
import Card from "../components/Card";
import Badge from "../components/Badge";

function ContactsPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-white mb-6">Contacts</h1>
      <div className="flex flex-col gap-3">
        {contacts.map((contact) => (
          <Card key={contact.id} padding="medium">
            <div className="flex items-center gap-4">
              <img
                src={contact.avatar}
                alt={contact.name}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div className="flex-1">
                <p className="text-white font-medium">{contact.name}</p>
              </div>
              <Badge
                variant={contact.online ? "online" : "offline"}
                size="medium"
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default ContactsPage;
