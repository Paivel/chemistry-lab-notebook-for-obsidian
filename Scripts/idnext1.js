async function idnext(tp) {
    const options = await app.plugins.plugins.dataview.api.query('TABLE id1 FROM "Journal/Exp" WHERE typeof(id1) = "number" SORT id1 desc LIMIT 1')
    console.log(options.value)
    try{
        var result = options.value.values[0][1]+1
    }catch(err){var result = 1}
    return result
}
module.exports = idnext;
