import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Tables from './pages/Tables'
import TableView from './pages/TableView'
import TableEdit from './pages/TableEdit'
import TableNew from './pages/TableNew'
import SchemaView from './pages/SchemaView'
import SchemaEditor from './pages/SchemaEditor'
import SqlRunner from './pages/SqlRunner'
import Backup from './pages/Backup'
import Migration from './pages/Migration'
import Policies from './pages/Policies'
import Connections from './pages/Connections'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Tables />} />
          <Route path="tables" element={<Tables />} />
          <Route path="table/:tableName" element={<TableView />} />
          <Route path="table/:tableName/new" element={<TableNew />} />
          <Route path="table/:tableName/edit/:id" element={<TableEdit />} />
          <Route path="schema" element={<SchemaView />} />
          <Route path="schema/editor" element={<SchemaEditor />} />
          <Route path="sql" element={<SqlRunner />} />
          <Route path="backup" element={<Backup />} />
          <Route path="migration" element={<Migration />} />
          <Route path="policies" element={<Policies />} />
          <Route path="connections" element={<Connections />} />
        </Route>
      </Routes>
    </Router>
  )
}
