module.exports = () => ({
    settings: {
        parser: {
            enabled: true,
            multipart: true,
            formidable: {
                maxFileSize: 10 * 1024 * 1024,
            },
        },
    },
});
