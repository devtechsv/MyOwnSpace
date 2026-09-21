import { render, screen, fireEvent } from '@testing-library/react';
import { UsersTable } from './UsersTable';
import { User } from '@/contracts/interfaces/user';

const activo: User = {
  id: 'u1',
  nombre: 'Julio Pérez',
  correo: 'julio.perez@devtch.com',
  rol: 'Administrador',
  estado: 'Activo',
  fechaIngreso: '2022-01-10',
};

const pendiente: User = {
  id: 'u5',
  nombre: 'Sofía Nuñez',
  correo: 'sofia.nunez@devtch.com',
  rol: 'Empleado',
  estado: 'Pendiente',
  fechaIngreso: '2025-01-01',
};

const desactivado: User = {
  id: 'u6',
  nombre: 'Marta Gómez',
  correo: 'marta.gomez@devtch.com',
  rol: 'Empleado',
  estado: 'Desactivado',
  fechaIngreso: '2021-05-01',
};

describe('UsersTable', () => {
  it('muestra el estado de carga', () => {
    render(
      <UsersTable users={[]} isLoading error={null} />,
    );
    expect(screen.getByText(/cargando usuarios/i)).toBeInTheDocument();
  });

  it('muestra un mensaje cuando no hay usuarios', () => {
    render(<UsersTable users={[]} isLoading={false} error={null} />);
    expect(screen.getByText(/todavía no hay usuarios/i)).toBeInTheDocument();
  });

  it('marca con "TÚ" la fila del usuario logueado', () => {
    render(
      <UsersTable
        users={[activo]}
        isLoading={false}
        error={null}
        currentUserId='u1'
      />,
    );
    expect(screen.getByText('TÚ')).toBeInTheDocument();
  });

  it('no muestra "TÚ" en filas de otros usuarios', () => {
    render(
      <UsersTable
        users={[activo]}
        isLoading={false}
        error={null}
        currentUserId='otro-id'
      />,
    );
    expect(screen.queryByText('TÚ')).not.toBeInTheDocument();
  });

  it('Activo: muestra Editar, Resetear contraseña y Desactivar', () => {
    render(<UsersTable users={[activo]} isLoading={false} error={null} />);

    expect(screen.getByTitle('Editar')).toBeInTheDocument();
    expect(screen.getByTitle('Resetear contraseña')).toBeInTheDocument();
    expect(screen.getByTitle('Desactivar')).toBeInTheDocument();
    expect(screen.queryByTitle('Activar')).not.toBeInTheDocument();
  });

  it('Pendiente: solo muestra Editar (sin resetear ni activar/desactivar)', () => {
    render(<UsersTable users={[pendiente]} isLoading={false} error={null} />);

    expect(screen.getByTitle('Editar')).toBeInTheDocument();
    expect(screen.queryByTitle('Resetear contraseña')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Desactivar')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Activar')).not.toBeInTheDocument();
  });

  it('Desactivado: muestra Editar y Activar (sin resetear ni desactivar)', () => {
    render(<UsersTable users={[desactivado]} isLoading={false} error={null} />);

    expect(screen.getByTitle('Editar')).toBeInTheDocument();
    expect(screen.getByTitle('Activar')).toBeInTheDocument();
    expect(screen.queryByTitle('Resetear contraseña')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Desactivar')).not.toBeInTheDocument();
  });

  it('llama a los callbacks con el usuario correspondiente', () => {
    const onEdit = jest.fn();
    const onResetPassword = jest.fn();
    const onToggleStatus = jest.fn();

    render(
      <UsersTable
        users={[activo]}
        isLoading={false}
        error={null}
        onEdit={onEdit}
        onResetPassword={onResetPassword}
        onToggleStatus={onToggleStatus}
      />,
    );

    fireEvent.click(screen.getByTitle('Editar'));
    fireEvent.click(screen.getByTitle('Resetear contraseña'));
    fireEvent.click(screen.getByTitle('Desactivar'));

    expect(onEdit).toHaveBeenCalledWith(activo);
    expect(onResetPassword).toHaveBeenCalledWith(activo);
    expect(onToggleStatus).toHaveBeenCalledWith(activo);
  });
});
