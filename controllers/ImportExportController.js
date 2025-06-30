import multer from 'multer';

export class ImportExportController {
    constructor(importExportService) {
        this.importExportService = importExportService;
        this.setupMulter();
    }

    setupMulter() {
        const storage = multer.memoryStorage();
        this.upload = multer({
            storage,
            limits: {
                fileSize: 10 * 1024 * 1024
            },
            fileFilter: (req, file, cb) => {
                const allowedTypes = [
                    'text/csv',
                    'application/vnd.ms-excel',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                ];

                if (allowedTypes.includes(file.mimetype)) {
                    cb(null, true);
                } else {
                    cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
                }
            }
        });
    }

    importTransactions = async (req, res, next) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'No file uploaded'
                });
            }

            const result = await this.importExportService.importTransactions(
                req.user.id,
                req.file.buffer,
                req.file.mimetype
            );

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    };

    exportTransactions = async (req, res, next) => {
        try {
            const { start_date, end_date, format = 'csv' } = req.query;

            const result = await this.importExportService.exportTransactions(
                req.user.id,
                start_date,
                end_date,
                format
            );

            res.setHeader('Content-Type', result.contentType);
            res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(result.filename)}`);

            if (format === 'csv') {
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Pragma', 'no-cache');
            }

            res.send(result.data);
        } catch (error) {
            next(error);
        }
    };

    exportBudgetReport = async (req, res, next) => {
        try {
            const result = await this.importExportService.exportBudgetReport(req.user.id);

            res.setHeader('Content-Type', result.contentType);
            res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(result.filename)}`);
            res.send(result.data);
        } catch (error) {
            next(error);
        }
    };

    exportReport = async (req, res, next) => {
        try {
            const { month, year, account_id, format = 'pdf' } = req.query;

            const result = await this.importExportService.exportReport(
                req.user.id,
                month ? parseInt(month) : null,
                year ? parseInt(year) : null,
                account_id || null,
                format
            );

            res.setHeader('Content-Type', result.contentType);
            res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(result.filename)}`);
            res.send(result.data);
        } catch (error) {
            next(error);
        }
    };

    getUploadMiddleware() {
        return this.upload.single('file');
    }
}