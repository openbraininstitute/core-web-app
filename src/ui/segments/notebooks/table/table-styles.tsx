'use client';

export default function TableStyles() {
  return (
    <style jsx global>{`
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

      #popover * {
        background-color: #002766 !important;
      }
    `}</style>
  );
}
