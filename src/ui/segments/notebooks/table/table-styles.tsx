'use client';

export default function TableStyles() {
  return (
    <style jsx global>{`
      /* Make entire table background transparent */
      #table-container .ant-table {
        background-color: transparent !important;
      }

      #table-container .ant-table-container {
        background-color: transparent !important;
      }

      /* Change color of sorting icons */
      #table-container .ant-table-column-sorter-up,
      #table-container .ant-table-column-sorter-down {
        color: #bae7ff;
      }

      #table-container .ant-table-column-sorter-up.active,
      #table-container .ant-table-column-sorter-down.active {
        color: #fff !important;
      }

      #table-container .ant-table-thead > tr > th {
        background-color: transparent !important; /* Transparent header background */
        font-weight: normal !important;
        color: #002766 !important; /* Blue text for headers */
      }

      #table-container .ant-table-tbody > tr > td {
        background-color: transparent !important; /* Transparent cell background */
        color: #002766 !important; /* Blue text for table content */
      }

      #table-container .ant-table-tbody > tr:hover > td {
        background-color: rgba(0, 39, 102, 0.05) !important; /* Light blue hover effect */
      }

      #table-container .ant-table-tbody > tr {
        background-color: transparent !important; /* Transparent row background */
      }

      #popover * {
        background-color: #002766 !important;
      }
    `}</style>
  );
}
