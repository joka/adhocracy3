"""Export adhocracy3 users to CSV.

This is registered as console script 'export_users' in setup.py.

"""
import argparse
import csv
import inspect
from pyramid.paster import bootstrap
from pyramid.registry import Registry
from pyramid.request import Request
from substanced.interfaces import IUserLocator

from adhocracy_core.interfaces import IResource
from adhocracy_core.resources.principal import IUser
from adhocracy_core.sheets.metadata import IMetadata
from adhocracy_core.utils import create_filename
from adhocracy_core.utils import get_sheet_field


def export_users():  # pragma: no cover
    """Export all users.

    usage::

        bin/export_users <ini file>
    """
    docstring = inspect.getdoc(export_users)
    parser = argparse.ArgumentParser(description=docstring)
    parser.add_argument('ini_file',
                        help='path to the adhocracy backend ini file')
    args = parser.parse_args()
    env = bootstrap(args.ini_file)
    filename = create_filename(directory='./var/export/',
                               prefix='adhocracy-users',
                               suffix='.csv')
    _export_users(env['root'], env['registry'], filename)
    env['closer']()


def _export_users(root, registry, filename):  # pragma: no cover
    users = _get_users(root, registry)
    with open(filename, 'w', newline='') as result_file:
        wr = csv.writer(result_file, delimiter=';', quotechar='"',
                        quoting=csv.QUOTE_MINIMAL)
        _write_users_to_csv(users, wr)
    print('Users exported to {}'.format(filename))


def _get_users(root: IResource, registry: Registry) -> [IUser]:
    request = Request.blank('/dummy')
    locator = registry.getMultiAdapter((root, request), IUserLocator)
    return locator.get_users()


def _write_users_to_csv(users: [IUser], writer: object) -> None:
    writer.writerow(['Username', 'Email', 'Creation date'])
    for user in users:
        creation_date = get_sheet_field(user, IMetadata, 'creation_date')
        writer.writerow([user.name, user.email, creation_date])