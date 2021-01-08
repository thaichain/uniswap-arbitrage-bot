module.exports = (schema, options) => {
  schema.statics.upsert = async function (query, data) {
    let record = await this.findOne(query);
    let doc;
    if (!record) {
      record = new this(data);
      doc = await record.save();
    } else if (data.tokenWeth != undefined && record.tokenWeith == undefined) {
      Object.keys(data).forEach((k) => {
        record[k] = data[k];
      });
      record.save();
    }
    return doc ? doc : false;
  };
};
