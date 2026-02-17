const guidesQuery = `*[_type=="guides"]{
  title,
  slug,
  topic,
  scale,
  content
}`;

export default guidesQuery;
