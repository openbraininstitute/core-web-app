function getSection(pathname: string): string | undefined {
  // match two uuids followed by the section name
  //   const regex = /^\/?[^/]+\/[^/]+\/[0-9a-fA-F-]{36}\/[0-9a-fA-F-]{36}\/([^/]+)/;
  const regex = /^\/?[^/]+\/[^/]+\/[0-9a-fA-F-]{36}\/[0-9a-fA-F-]{36}(?:\/([^/]*))?/;
  const match = pathname.match(regex);

  return match?.[1] ?? '';
}

export function getActiveSection(pathname: string): string | undefined {
  const section = getSection(pathname);
  return section;
}
