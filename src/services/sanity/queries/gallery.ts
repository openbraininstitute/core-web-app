const galleryQuery = `*[_type == "gallery"] {
  title,
  description,
  mediaType,
  "image": image.asset->url,
  video,
  brainRegion,
  has_background,
  backgroundColor,
}`;

export default galleryQuery;
