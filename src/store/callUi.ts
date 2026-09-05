let incomingOpen = false;
let skipIncomingExit = false;

export function setIncomingOpen(open: boolean) {
  incomingOpen = open;
}

export function isIncomingOpen() {
  return incomingOpen;
}

export function setSkipIncomingExit(skip: boolean) {
  skipIncomingExit = skip;
}

export function consumeSkipIncomingExit() {
  const skip = skipIncomingExit;
  skipIncomingExit = false;
  return skip;
}
