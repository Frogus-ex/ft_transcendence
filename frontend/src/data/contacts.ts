export type Contact = {
  id: number;
  name: string;
  avatar: string;
  online: boolean;
};

export const contacts: Contact[] = [
  {
    id: 1,
    name: "Alice Martin",
    avatar: "https://i.pravatar.cc/150?img=1",
    online: true,
  },
  {
    id: 2,
    name: "Bob Chen",
    avatar: "https://i.pravatar.cc/150?img=2",
    online: false,
  },
  {
    id: 3,
    name: "Chloé Dubois",
    avatar: "https://i.pravatar.cc/150?img=3",
    online: true,
  },
];
