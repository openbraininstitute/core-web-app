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
        background-color: #002766 !important; /* Matching header background color */
        font-weight: normal !important;
      }

      #popover * {
        background-color: #002766 !important;
      }
    `}</style>
  );
}
