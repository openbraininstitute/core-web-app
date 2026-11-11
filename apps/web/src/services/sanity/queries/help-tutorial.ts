const tutorialQuery = `*[_type == "documentationSettings"][0] {
  tutorialOrder[]-> {
    title, 
    description,
    "slug": slug.current,
    "url": videoUrl,
    transcript,
    "imageURL": thumbnail.asset->url,
    "imageWidth": thumbnail.asset->metadata.dimensions.width,
    "imageHeight": thumbnail.asset->metadata.dimensions.height,
    steps
  }
}`;

export default tutorialQuery;
