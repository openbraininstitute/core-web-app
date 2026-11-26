const queryForOBIShowcases = `*[_type == "publicProjects"][] {
  name,
  'slug': slug.current,
  authorsList,
  introduction,
  _updatedAt,
  'heroImage': heroImage.asset->url,
}`;

export default queryForOBIShowcases;
