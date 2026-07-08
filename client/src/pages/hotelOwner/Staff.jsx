import React, { useEffect, useMemo, useState } from 'react'
import Title from '../../components/Title';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

const STAFF_ROLES = ['receptionist', 'cashier', 'admin'];

const roleLabel = (role) => {
  if(role === 'admin') return 'Admin';
  if(role === 'cashier') return 'Cashier';
  if(role === 'receptionist') return 'Receptionist';
  return 'Guest';
}

const roleStyle = (role) => {
  if(role === 'admin') return 'bg-purple-50 text-purple-700 border-purple-100';
  if(role === 'cashier') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  return 'bg-blue-50 text-blue-700 border-blue-100';
}

const EditIcon = () => (
  <svg aria-hidden='true' className='h-4 w-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
    <path d='M12 20h9' />
    <path d='M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z' />
  </svg>
)

const DeleteIcon = () => (
  <svg aria-hidden='true' className='h-4 w-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
    <path d='M3 6h18' />
    <path d='M8 6V4h8v2' />
    <path d='M19 6l-1 14H6L5 6' />
    <path d='M10 11v5M14 11v5' />
  </svg>
)

const Staff = () => {

  const {axios, getToken, user} = useAppContext();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addUsername, setAddUsername] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addRole, setAddRole] = useState('receptionist');
  const [editStaff, setEditStaff] = useState(null);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState('receptionist');
  const [removeStaff, setRemoveStaff] = useState(null);
  const [savingId, setSavingId] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const {data} = await axios.get('/api/user/admin/all', {headers: {Authorization: `Bearer ${await getToken()}`}});
      if(data.success){
        setUsers(data.users);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); }, []);

  const changeRole = async (userId, role) => {
    setSavingId(userId);
    try {
      const {data} = await axios.put('/api/user/admin/role', {userId, role},
        {headers: {Authorization: `Bearer ${await getToken()}`}});
      if(data.success){
        toast.success(data.message);
        fetchUsers();
        return true;
      }
      toast.error(data.message);
      return false;
    } catch (error) {
      toast.error(error.message);
      return false;
    } finally {
      setSavingId(null);
    }
  }

  const submitAddStaff = async (e) => {
    e.preventDefault();
    if(!addUsername.trim() || !addEmail.trim() || !addPassword || !addRole){
      toast.error('All fields are required');
      return;
    }
    if(addPassword.length < 8){
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSavingId('add');
    try {
      const {data} = await axios.post('/api/user/admin/staff',
        { username: addUsername, email: addEmail, password: addPassword, role: addRole },
        { headers: { Authorization: `Bearer ${await getToken()}` } }
      );
      if(data.success){
        toast.success(data.message);
        fetchUsers();
        setIsAddOpen(false);
        setAddUsername('');
        setAddEmail('');
        setAddPassword('');
        setAddRole('receptionist');
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingId(null);
    }
  }

  const openEdit = (staff) => {
    setEditStaff(staff);
    setEditUsername(staff.username);
    setEditEmail(staff.email);
    setEditPassword('');
    setEditRole(staff.role);
  }

  const submitEdit = async (e) => {
    e.preventDefault();
    if(!editStaff) return;
    if(!editUsername.trim() || !editEmail.trim() || !editRole){
      toast.error('Name, email, and role are required');
      return;
    }
    if(editPassword && editPassword.length < 8){
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSavingId(editStaff._id);
    try {
      const payload = {
        userId: editStaff._id,
        username: editUsername,
        email: editEmail,
        role: editRole
      };
      if (editPassword) {
        payload.password = editPassword;
      }
      const {data} = await axios.put('/api/user/admin/role', payload,
        {headers: {Authorization: `Bearer ${await getToken()}`}});
      if(data.success){
        toast.success(data.message);
        fetchUsers();
        setEditStaff(null);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingId(null);
    }
  }

  const confirmRemove = async () => {
    if(!removeStaff) return;
    const ok = await changeRole(removeStaff._id, 'guest');
    if(ok) setRemoveStaff(null);
  }

  const staffUsers = useMemo(() => users.filter(u => STAFF_ROLES.includes(u.role)), [users]);

  if(loading) return <p className='mt-10 text-gray-500'>Loading staff...</p>

  return (
    <div className='pb-15 max-w-6xl'>
      <div className='flex items-start justify-between gap-4 flex-wrap'>
        <Title align='left' font='outfit' title='Staff' subtitle='Manage receptionist, cashier, and admin access to the hotel dashboard.' />
        <button
          onClick={() => setIsAddOpen(true)}
          className='bg-black text-white px-5 py-2.5 rounded-full text-sm font-medium hover:opacity-90 transition cursor-pointer whitespace-nowrap'
        >
          + Add Staff
        </button>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 max-w-4xl'>
        {STAFF_ROLES.map(role => (
          <div key={role} className='rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
            <p className='text-xs uppercase text-gray-400'>{roleLabel(role)}</p>
            <p className='text-2xl font-semibold text-gray-900 mt-1'>{staffUsers.filter(u => u.role === role).length}</p>
          </div>
        ))}
      </div>

      <div className='w-full max-w-5xl text-left border border-gray-200 bg-white rounded-lg mt-8 overflow-hidden shadow-sm'>
        <div className='grid grid-cols-[1.3fr_1.5fr_auto] gap-4 bg-gray-50 px-5 py-3 text-sm font-medium text-gray-800'>
          <p>Staff Member</p>
          <p className='max-sm:hidden'>Email</p>
          <p className='text-right'>Actions</p>
        </div>

        <div className='divide-y divide-gray-200'>
          {staffUsers.map(staff => {
            const isSelf = staff._id === user?.id;
            return (
              <div key={staff._id} className='grid grid-cols-[1.3fr_1.5fr_auto] gap-4 px-5 py-4 items-center'>
                <div className='min-w-0'>
                  <p className='font-medium text-gray-900 truncate'>{staff.username}</p>
                  <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-medium ${roleStyle(staff.role)}`}>
                    {roleLabel(staff.role)}
                  </span>
                  <p className='text-xs text-gray-500 mt-2 sm:hidden truncate'>{staff.email}</p>
                </div>
                <p className='text-sm text-gray-600 truncate max-sm:hidden'>{staff.email}</p>
                <div className='flex justify-end gap-2'>
                  <button type='button' title='Edit staff role' aria-label={`Edit ${staff.username}`}
                    onClick={() => openEdit(staff)}
                    disabled={isSelf || savingId === staff._id}
                    className='inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed'>
                    <EditIcon />
                  </button>
                  <button type='button' title='Remove staff access' aria-label={`Remove ${staff.username}`}
                    onClick={() => setRemoveStaff(staff)}
                    disabled={isSelf || savingId === staff._id}
                    className='inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed'>
                    <DeleteIcon />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {staffUsers.length === 0 && (
          <p className='text-gray-400 text-sm p-5'>
            No staff yet. Click "Add Staff" to create one.
          </p>
        )}
      </div>

      {isAddOpen && (
        <div className='fixed inset-0 bg-black/50 z-[60] flex items-center justify-center px-4'
          onClick={() => { setIsAddOpen(false); setAddUsername(''); setAddEmail(''); setAddPassword(''); setAddRole('receptionist'); }}>
          <form onSubmit={submitAddStaff}
            className='bg-white w-full max-w-lg rounded-2xl shadow-xl p-6 relative max-h-[85vh] flex flex-col'
            onClick={e => e.stopPropagation()}>
            <button type='button'
              className='absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl leading-none cursor-pointer'
              onClick={() => { setIsAddOpen(false); setAddUsername(''); setAddEmail(''); setAddPassword(''); setAddRole('receptionist'); }}
              aria-label='Close'>
              &times;
            </button>

            <h2 className='text-lg font-semibold text-gray-800 mb-1'>Add Staff</h2>
            <p className='text-sm text-gray-500 mb-4'>
              Create a new staff account directly by filling out the details below.
            </p>

            <div className='flex flex-col gap-4 overflow-y-auto pr-1'>
              <div>
                <label className='text-sm font-medium text-gray-700 block mb-1'>Full Name</label>
                <input
                  type='text'
                  required
                  autoFocus
                  value={addUsername}
                  onChange={e => setAddUsername(e.target.value)}
                  placeholder='Enter full name...'
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-black transition'
                />
              </div>

              <div>
                <label className='text-sm font-medium text-gray-700 block mb-1'>Email Address</label>
                <input
                  type='email'
                  required
                  value={addEmail}
                  onChange={e => setAddEmail(e.target.value)}
                  placeholder='Enter email address...'
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-black transition'
                />
              </div>

              <div>
                <label className='text-sm font-medium text-gray-700 block mb-1'>Password</label>
                <input
                  type='password'
                  required
                  value={addPassword}
                  onChange={e => setAddPassword(e.target.value)}
                  placeholder='Enter temporary password (min 8 characters)...'
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-black transition'
                />
              </div>

              <div>
                <label className='text-sm font-medium text-gray-700 block mb-1'>Role</label>
                <select value={addRole} onChange={e => setAddRole(e.target.value)}
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-black'>
                  <option value='receptionist'>Receptionist</option>
                  <option value='cashier'>Cashier</option>
                  <option value='admin'>Admin</option>
                </select>
              </div>
            </div>

            <div className='mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end'>
              <button type='button' onClick={() => { setIsAddOpen(false); setAddUsername(''); setAddEmail(''); setAddPassword(''); setAddRole('receptionist'); }}
                className='rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50'>
                Cancel
              </button>
              <button type='submit' disabled={savingId === 'add'}
                className='rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50'>
                {savingId === 'add' ? 'Adding...' : 'Add Staff'}
              </button>
            </div>
          </form>
        </div>
      )}

      {editStaff && (
        <div className='fixed inset-0 bg-black/50 z-[60] flex items-center justify-center px-4'>
          <form onSubmit={submitEdit} className='bg-white w-full max-w-lg rounded-2xl shadow-xl p-6 relative max-h-[85vh] flex flex-col'>
            <button type='button'
              className='absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl leading-none cursor-pointer'
              onClick={() => setEditStaff(null)}
              aria-label='Close'>
              &times;
            </button>

            <h2 className='text-lg font-semibold text-gray-800 mb-1'>Edit Staff</h2>
            <p className='text-sm text-gray-500 mb-4'>Update staff member's details and role access.</p>

            <div className='flex flex-col gap-4 overflow-y-auto pr-1'>
              <div>
                <label className='text-sm font-medium text-gray-700 block mb-1'>Full Name</label>
                <input
                  type='text'
                  required
                  value={editUsername}
                  onChange={e => setEditUsername(e.target.value)}
                  placeholder='Enter full name...'
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-black transition'
                />
              </div>

              <div>
                <label className='text-sm font-medium text-gray-700 block mb-1'>Email Address</label>
                <input
                  type='email'
                  required
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  placeholder='Enter email address...'
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-black transition'
                />
              </div>

              <div>
                <label className='text-sm font-medium text-gray-700 block mb-1'>Password</label>
                <input
                  type='password'
                  value={editPassword}
                  onChange={e => setEditPassword(e.target.value)}
                  placeholder='Leave blank to keep current password...'
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-black transition'
                />
              </div>

              <div>
                <label className='text-sm font-medium text-gray-700 block mb-1'>Role</label>
                <select value={editRole} onChange={e => setEditRole(e.target.value)}
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-black'>
                  <option value='receptionist'>Receptionist</option>
                  <option value='cashier'>Cashier</option>
                  <option value='admin'>Admin</option>
                </select>
              </div>
            </div>

            <div className='mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end'>
              <button type='button' onClick={() => setEditStaff(null)}
                className='rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50'>
                Cancel
              </button>
              <button type='submit' disabled={savingId === editStaff._id}
                className='rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50'>
                {savingId === editStaff._id ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {removeStaff && (
        <div className='fixed inset-0 bg-black/50 z-[60] flex items-center justify-center px-4'>
          <div className='bg-white w-full max-w-md rounded-2xl shadow-xl p-6'>
            <h2 className='text-lg font-semibold text-gray-800'>Remove Staff Access?</h2>
            <p className='text-sm text-gray-600 mt-2'>
              This will remove dashboard access from <span className='font-medium text-gray-900'>{removeStaff.username}</span>.
              Their account will stay as a guest account.
            </p>

            <div className='mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end'>
              <button type='button' onClick={() => setRemoveStaff(null)}
                className='rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50'>
                Cancel
              </button>
              <button type='button' onClick={confirmRemove} disabled={savingId === removeStaff._id}
                className='rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50'>
                {savingId === removeStaff._id ? 'Removing...' : 'Remove Access'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Staff
