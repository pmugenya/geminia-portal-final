import { Injectable } from '@angular/core';
import { User } from './user.types';

@Injectable({
    providedIn: 'root'
})
export class UserCrudService {
    private users: User[] = [
        { id: "1", name: 'John Doe', email: 'john@example.com', phone: '123-456-7890', avatar: 'assets/images/avatars/john.jpg', status: 'active' },
        { id: "2", name: 'Jane Smith', email: 'jane@example.com', phone: '098-765-4321', avatar: 'assets/images/avatars/jane.jpg', status: 'active' },
        { id: "3", name: 'Mike Johnson', email: 'mike@example.com', phone: '555-123-4567', avatar: 'assets/images/avatars/mike.jpg', status: 'inactive' }
    ];
    private nextId = 4;

    getUsers(): User[] {
        return this.users;
    }

    addUser(user: Omit<User, 'id'>): void {
        this.users.push({
            ...user,
            id: ''+ this.nextId++,
            avatar: user['avatar'] || 'assets/images/avatars/default.jpg',
            status: user['status'] || 'active'
        });
    }

    updateUser(updatedUser: User): void {
        const index = this.users.findIndex(u => u.id === updatedUser.id);
        if (index !== -1) {
            this.users[index] = updatedUser;
        }
    }

    deleteUser(id: string): void {
        this.users = this.users.filter(u => u.id !== id);
    }

    getUserById(id: string): User | undefined {
        return this.users.find(u => u.id === id);
    }
}
