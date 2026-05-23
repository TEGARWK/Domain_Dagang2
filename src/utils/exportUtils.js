import * as XLSX from 'xlsx';

/**
 * Export JSON data to Excel file
 * @param {Array} data - Array of objects to export
 * @param {string} fileName - Name of the file (without extension)
 * @param {string} sheetName - Name of the worksheet
 */
export const exportToExcel = (data, fileName = 'ExportData', sheetName = 'Sheet1') => {
    try {
        if (!data || data.length === 0) {
            console.error('No data to export');
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        // Generate Excel file and trigger download
        XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        return true;
    } catch (error) {
        console.error('Export Excel Error:', error);
        return false;
    }
};

/**
 * Clean data for export (flattening objects or formatting dates)
 * @param {Array} data - Raw data
 * @param {Array} columns - Optional: mapping of keys to headers { key: 'Header Name' }
 */
export const formatDataForExport = (data, columns = null) => {
    if (!data) return [];
    
    return data.map(item => {
        let formatted = {};
        
        if (columns) {
            // Only export specified columns with custom headers
            Object.keys(columns).forEach(key => {
                let val = item[key];
                // Basic date formatting if it looks like a date string
                if (typeof val === 'string' && val.includes('-') && val.length >= 10 && !isNaN(Date.parse(val))) {
                    val = new Date(val).toLocaleString('id-ID');
                }
                formatted[columns[key]] = val;
            });
        } else {
            // Export all columns
            formatted = { ...item };
        }
        
        return formatted;
    });
};
