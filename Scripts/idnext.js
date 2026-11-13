async function idnext(tp) {
    const options = await app.plugins.plugins.dataview.api.query('TABLE id FROM "Journal" WHERE typeof(id) = "number" SORT id desc LIMIT 1')
    console.log(options.value)
    try{
        var result = options.value.values[0][1]+1
    }catch(err){var result = 1}
    return result
}
module.exports = idnext;