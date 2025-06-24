export const notFound = (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        message: `Route ${req.originalUrl} not found`
    });
};