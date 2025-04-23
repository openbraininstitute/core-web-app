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
        artifactType[],
        artifact[] {
            title, 
            description,
            "file": file.asset->url,
            url,
            _type,
        },
        meModelsList[] {
            'file': file.asset->url,
            name,
            brainRegion,
            validated,
            mType,
            eType,
            morphologyId,
            hasMorphologyThumbnail,
            "morphology": morphology.asset->url,
            traceFileId,
            hasTraceThumbnail,
            "trace": trace.asset->url,
            url,
            _type,
        },
        minimalMeModel[] {
            name,
            brainRegion,
            mType,
            eType,
            species,
        },
        eModelsList[] {
            name,
            hasResponseThumbnail,
            'response': response.asset->url,
            brainRegion,
            mType,
            eType,
            hasMorphologyThumbnail,
            modelCumulatedScore,
            species,
            contributor,
            creationDate,
        },
        notebook[] {
            name,
            url,
            readMe,
        },
         _updatedAt,
    }`;

export default singleCaseQuery;
