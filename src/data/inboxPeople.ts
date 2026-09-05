export type InboxPerson = {
  id: string;
  name: string;
  avatar: string;
  online: boolean;
};

let people: Record<string, InboxPerson> = {};

export function rememberInboxPerson(person: InboxPerson) {
  people[person.id] = person;
}

export function rememberInboxPeople(next: Record<string, InboxPerson>) {
  people = { ...next };
}

export function getInboxPerson(id: string) {
  return people[id];
}

export function allInboxPeople() {
  return people;
}
