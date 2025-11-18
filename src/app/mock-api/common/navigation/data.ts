/* eslint-disable */
import { FuseNavigationItem } from '@fuse/components/navigation';

const STORAGE_KEYS = {
    USER_DATA: 'geminia_user_data'
};


const checkPermission = (permName: string): boolean => {
       const hasPermission = false;
       const currentUser = JSON.parse(sessionStorage.getItem(STORAGE_KEYS.USER_DATA));
       if(currentUser && currentUser.userType===permName) {
          return true;
       }
    return hasPermission;
};

const PERM_ARR: FuseNavigationItem[] = [

    {
        id   : 'dashboard',
        title: 'Dashboard',
        type : 'basic',
        icon: 'heroicons_outline:home',
        link : '/dashboard',
        hidden: item => !checkPermission('C')
    },
    {
        id   : 'dashboard',
        title: 'Dashboard',
        type : 'basic',
        icon: 'heroicons_outline:home',
        link : '/agentdashboard',
        hidden: item => !checkPermission('A')
    },
    {
        id: 'quote-management',
        title: 'Quotes',
        type: 'collapsable',
        icon: 'heroicons_outline:document-text',
        children: [
            {
                id: 'marinequote',
                title: 'Marine Quote',
                type: 'basic',
                icon: 'heroicons_outline:globe-alt',
                link: '/marinequote'
            },
            {
                id: 'example2',
                title: 'Travel Quote',
                type: 'basic',
                icon: 'heroicons_outline:map',
                link: '/example'
            },
            {
                id: 'quotlisting',
                title: 'My Quotes',
                type: 'basic',
                icon: 'heroicons_outline:clipboard-document-list',
                link: '/clientquotes'
            },
        ]
    },
    {
        id: 'policy-management',
        title: 'Policies',
        type: 'collapsable',
        icon: 'heroicons_outline:document-text',
        children: [
            {
                id: 'policylisting',
                title: 'My Policies',
                type: 'basic',
                icon: 'heroicons_outline:clipboard-document-list',
                link: '/clientpolicies'
            },
        ]
    },
];

export const defaultNavigation: FuseNavigationItem[] = PERM_ARR ;

export const compactNavigation: FuseNavigationItem[] = [
    {
        id   : 'example',
        title: 'Example',
        type : 'basic',
        icon : 'heroicons_outline:chart-pie',
        link : '/example'
    }
];
export const futuristicNavigation: FuseNavigationItem[] = [
    {
        id   : 'example',
        title: 'Example',
        type : 'basic',
        icon : 'heroicons_outline:chart-pie',
        link : '/example'
    }
];
export const horizontalNavigation: FuseNavigationItem[] = [
    {
        id   : 'example',
        title: 'Example',
        type : 'basic',
        icon : 'heroicons_outline:chart-pie',
        link : '/example'
    }
];
