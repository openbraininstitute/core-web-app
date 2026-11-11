const queryForArtifactTypes = `*[_type == "glossaryItem" && !(Name in ["Model Data", "Experimental Data"])] | order(Name asc)
    {
    Name,
    New_suggested_name,
    Description,
    Data_Type,
    Scale,
    Status,
    definition
}`;

export default queryForArtifactTypes;
