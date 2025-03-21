const singleCaseQuery = (slug: string) =>
  `*[_type == "publicProjects" && slug.current == "${slug}"][0] {
        name,
        'slug': slug.current,
        introduction,
        'heroImage': heroImage.asset->url,
        authorsList[] {
            firstName,
            lastName,
            email,
            institution
        },
        description,
        videosList[] {
            url,
            title,
            alt,
            hasCaption,
            useTimestamps,
            'captionTrack': captionTrack.asset->url
        },
        artifactType,
        artifact[] {
            title, 
            description,
            "file": file.asset->url,
            url,
            _type,
        },
        meModelsList[] {
            name,
            "morphology": morphology.asset->url,
            "trace": trace.asset->url,
            validated,
            brainRegion,
            mType,
            eType,
            url,
            _type,
        },
        eModelsList[] {
            name,
            "response": response.asset->url,
            brainRegion,
            mType,
            eType,
            modelCumulatedScore,
            _type,
        },
        notebook[] {
            name,
            url,
            readMe,
        },
         _updatedAt,
    }`;

export default singleCaseQuery;
