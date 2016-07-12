import json
import os

from pyramid.request import Request
from pytest import fixture
from pytest import mark
from substanced.interfaces import IUserLocator
from substanced.util import find_service
from tempfile import mkstemp
import pytest

from adhocracy_core.resources.root import IRootPool


@mark.usefixtures('integration')
class TestImportUsers:

    def _get_user_locator(self, context, registry):
        request = Request.blank('/dummy')
        request.registry = registry
        locator = registry.getMultiAdapter((context, request), IUserLocator)
        return locator

    @fixture
    def context(self, registry):
        return registry.content.create(IRootPool.__identifier__)

    def call_fut(self, root, registry, filename):
        from adhocracy_core.scripts.ad_import_users import import_users
        return import_users(root, registry, filename)


    def test_create(self, context, registry, log):
        from adhocracy_core.interfaces import DEFAULT_USER_GROUP_NAME
        from pyramid.traversal import resource_path
        from adhocracy_core.interfaces import DEFAULT_USER_GROUP_NAME
        self._tempfd, filename = mkstemp()
        with open(filename, 'w') as f:
            f.write(json.dumps([
                {'name': 'Alice', 'email': 'alice@example.org',
                 'initial-password': 'weakpassword1', 'roles': ['contributor'],
                 'groups': ['gods']},
                {'name': 'Bob', 'email': 'bob@example.org',
                 'initial-password': 'weakpassword2', 'roles': [], 'groups': []}
            ]))
        locator = self._get_user_locator(context, registry)

        self.call_fut(context, registry, filename)

        god_group = context['principals']['groups']['gods']
        alice = locator.get_user_by_login('Alice')
        assert alice.active
        alice = locator.get_user_by_login('Alice')
        alice_user_id = resource_path(alice)
        groups = locator.get_groups(alice_user_id)
        assert groups == [god_group]
        bob = locator.get_user_by_login('Bob')
        default_group = context['principals']['groups'][DEFAULT_USER_GROUP_NAME]
        bob_user_id = resource_path(bob)
        groups = locator.get_groups(bob_user_id)
        assert groups == [default_group]


    def test_create_default_values(self, context, registry, log):
        from adhocracy_core.interfaces import DEFAULT_USER_GROUP_NAME
        from pyramid.traversal import resource_path
        self._tempfd, filename = mkstemp()
        with open(filename, 'w') as f:
            f.write(json.dumps([
                {'name': 'Bob', 'email': 'bob@example.org',
                 'initial-password': 'weakpassword2'}
            ]))
        locator = self._get_user_locator(context, registry)

        self.call_fut(context, registry, filename)

        bob = locator.get_user_by_login('Bob')
        default_group = context['principals']['groups'][DEFAULT_USER_GROUP_NAME]
        bob_user_id = resource_path(bob)
        groups = locator.get_groups(bob_user_id)
        assert groups == [default_group]

    def test_create_gen_default_password(self, context, registry, log):
        from pyramid.traversal import resource_path
        self._tempfd, filename = mkstemp()
        with open(filename, 'w') as f:
            f.write(json.dumps([
                {'name': 'Alice',
                 'email': 'alice@example.org',
                 'roles': ['contributor'],
                 'groups': ['gods']},
            ]))
        locator = self._get_user_locator(context, registry)

        self.call_fut(context, registry, filename)

        god_group = context['principals']['groups']['gods']
        alice = locator.get_user_by_login('Alice')
        assert alice.active
        alice = locator.get_user_by_login('Alice')
        alice_user_id = resource_path(alice)
        groups = locator.get_groups(alice_user_id)
        assert groups == [god_group]

    def test_create_email_not_lower_case(self, context, registry, log):
        self._tempfd, filename = mkstemp()
        with open(filename, 'w') as f:
            f.write(json.dumps([
                {'name': 'Alice', 'email': 'aLiCE@example.org',
                 'initial-password': 'weakpassword1', 'roles': ['contributor'],
                 'groups': ['gods']}
            ]))
        locator = self._get_user_locator(context, registry)

        self.call_fut(context, registry, filename)

        alice = locator.get_user_by_login('Alice')
        assert alice.active
        assert alice.email == 'alice@example.org'

    def test_update_same_name(self, context, registry, log):
        self._tempfd, filename = mkstemp()
        with open(filename, 'w') as f:
            f.write(json.dumps([
                {'name': 'Alice', 'email': 'alice@example.org',
                 'initial-password': 'weakpassword1', 'roles': ['contributor'],
                 'groups': ['gods']},
                {'name': 'Bob', 'email': 'bob@example.org',
                 'initial-password': 'weakpassword2', 'roles': [], 'groups': []}
            ]))
        locator = self._get_user_locator(context, registry)
        self.call_fut(context, registry, filename)
        alice = locator.get_user_by_login('Alice')
        old_password = alice.password
        with open(filename, 'w') as f:
            f.write(json.dumps([
                {'name': 'Alice', 'email': 'alice.new@example.org',
                 'initial-password': 'newpassword', 'roles': ['reader'],
                 'groups': ['gods']}]))

        self.call_fut(context, registry, filename)

        alice = locator.get_user_by_login('Alice')
        new_password = alice.password
        assert alice.roles == ['reader']
        assert alice.email == 'alice.new@example.org'
        assert new_password == old_password

    def test_update_new_name(self, context, registry, log):
        self._tempfd, filename = mkstemp()
        with open(filename, 'w') as f:
            f.write(json.dumps([
                {'name': 'Alice', 'email': 'alice@example.org',
                 'initial-password': 'weakpassword1', 'roles': ['contributor'],
                 'groups': ['gods']},
                {'name': 'Bob', 'email': 'bob@example.org',
                 'initial-password': 'weakpassword2', 'roles': [], 'groups': []}
            ]))
        locator = self._get_user_locator(context, registry)
        self.call_fut(context, registry, filename)
        alice = locator.get_user_by_login('Alice')
        old_password = alice.password
        with open(filename, 'w') as f:
            f.write(json.dumps([
                {'name': 'Alice New', 'email': 'alice@example.org',
                 'initial-password': 'newpassword', 'roles': ['reader'],
                 'groups': ['gods']}]))

        self.call_fut(context, registry, filename)
        old_alice = locator.get_user_by_login('Alice')
        assert old_alice is None

        alice = locator.get_user_by_login('Alice New')
        new_password = alice.password
        assert alice.roles == ['reader']
        assert alice.email == 'alice@example.org'
        assert new_password == old_password

    def test_update_already_existing_name(self, context, registry, log):
        self._tempfd, filename = mkstemp()
        with open(filename, 'w') as f:
            f.write(json.dumps([
                {'name': 'Alice', 'email': 'alice@example.org',
                 'initial-password': 'weakpassword1', 'roles': ['contributor'],
                 'groups': ['gods']},
                {'name': 'Bob', 'email': 'bob@example.org',
                 'initial-password': 'weakpassword2', 'roles': [], 'groups': []}
            ]))
        locator = self._get_user_locator(context, registry)
        self.call_fut(context, registry, filename)
        alice = locator.get_user_by_login('Alice')
        old_password = alice.password
        with open(filename, 'w') as f:
            f.write(json.dumps([
                {'name': 'Bob', 'email': 'alice@example.org',
                 'initial-password': 'newpassword', 'roles': ['reader'],
                 'groups': ['gods']}]))

        with pytest.raises(ValueError):
            self.call_fut(context, registry, filename)

    def test_update_already_existing_email(self, context, registry, log):
        self._tempfd, filename = mkstemp()
        with open(filename, 'w') as f:
            f.write(json.dumps([
                {'name': 'Alice', 'email': 'alice@example.org',
                 'initial-password': 'weakpassword1', 'roles': ['contributor'],
                 'groups': ['gods']},
                {'name': 'Bob', 'email': 'bob@example.org',
                 'initial-password': 'weakpassword2', 'roles': [], 'groups': []}
            ]))
        locator = self._get_user_locator(context, registry)
        self.call_fut(context, registry, filename)
        alice = locator.get_user_by_login('Alice')
        old_password = alice.password
        with open(filename, 'w') as f:
            f.write(json.dumps([
                {'name': 'Alice', 'email': 'bob@example.org',
                 'initial-password': 'newpassword', 'roles': ['reader'],
                 'groups': ['gods']}]))

        with pytest.raises(ValueError):
            self.call_fut(context, registry, filename)

    def test_update_badges(self, context, registry, log):
        from adhocracy_core import sheets
        self._tempfd, filename = mkstemp()
        with open(filename, 'w') as f:
            f.write(json.dumps([
                {'name': 'Alice', 'email': 'alice@example.org',
                 'initial-password': 'weakpassword1', 'roles': ['contributor'],
                 'groups': ['gods'], 'badges': ['Moderator', 'Beginner']},
            ]))
        locator = self._get_user_locator(context, registry)
        self.call_fut(context, registry, filename)

        with open(filename, 'w') as f:
            f.write(json.dumps([
                {'name': 'Alice', 'email': 'alice@example.org',
                 'badges': ['Expert']}]))

        self.call_fut(context, registry, filename)
        alice = locator.get_user_by_login('Alice')
        assignments = find_service(alice, 'badge_assignments').values()
        assert len(assignments) == 1

        assignment = assignments[0]
        assignment_sheet = registry.content.get_sheet(
            assignment,
            sheets.badge.IBadgeAssignment)
        badge = context['principals']['badges']['expert']
        assert assignment_sheet.get() == {'object': alice,
                                          'badge': badge,
                                          'subject': alice}

    def test_create_and_send_invitation_mail(self, context, registry,
                                             mock_messenger):
        registry.messenger = mock_messenger
        self._tempfd, filename = mkstemp()
        with open(filename, 'w') as f:
            f.write(json.dumps([
                {'name': 'Alice', 'email': 'alice@example.org',
                 'initial-password': '', 'roles': [],
                 'groups': ['gods'], 'send_invitation_mail': True},
                {'name': 'Bob', 'email': 'bob@example.org',
                 'initial-password': 'weak', 'roles': [],
                 'groups': [], 'send_invitation_mail': False},
            ]))
        locator = self._get_user_locator(context, registry)

        self.call_fut(context, registry, filename)

        alice = locator.get_user_by_login('Alice')
        reset = context['principals']['resets'].values()[0]
        assert not mock_messenger.send_password_reset_mail.called
        assert len(mock_messenger.send_invitation_mail.call_args_list) == 1
        mock_messenger.send_invitation_mail.assert_called_with(
            alice, reset, subject_tmpl=None, body_tmpl=None)
        assert not alice.active

    def test_create_and_create_and_assign_badge(self, context, registry,
                                                mock_messenger):
        from adhocracy_core import sheets
        registry.messenger = mock_messenger
        self._tempfd, filename = mkstemp()
        with open(filename, 'w') as f:
            f.write(json.dumps([
                {'name': 'Alice', 'email': 'alice@example.org',
                 'initial-password': '', 'roles': [],
                 'groups': ['gods'], 'badges': ['Expert']},
                {'name': 'Bob', 'email': 'bob@example.org',
                 'initial-password': 'weak', 'roles': [],
                 'groups': [], 'badges': ['Expert']},
            ]))
        locator = self._get_user_locator(context, registry)

        self.call_fut(context, registry, filename)

        alice = locator.get_user_by_login('Alice')
        assignments = registry.content.get_sheet_field(alice,
                                                       sheets.badge.IBadgeable,
                                                       'assignments')
        assignment = assignments[0]
        assignment_sheet = registry.content.get_sheet(
            assignment,
            sheets.badge.IBadgeAssignment)
        badge = context['principals']['badges']['expert']
        assert assignment_sheet.get() == {'object': alice,
                                          'badge': badge,
                                          'subject': alice}
        bob = locator.get_user_by_login('Alice')
        assignments = registry.content.get_sheet_field(bob,
                                                       sheets.badge.IBadgeable,
                                                       'assignments')
        assignment = assignments[0]
        assignment_sheet = registry.content.get_sheet(
            assignment,
            sheets.badge.IBadgeAssignment)
        badge = context['principals']['badges']['expert']
        assert assignment_sheet.get() == {'object': bob,
                                          'badge': badge,
                                          'subject': bob}
        title = registry.content.get_sheet_field(badge,
                                                 sheets.title.ITitle,
                                                 'title')
        assert title == 'Expert'

    def test_create_and_send_invitation_mail_with_custom_subject(
            self, context, registry, mock_messenger):
        registry.messenger = mock_messenger
        self._tempfd, filename = mkstemp()
        subject_tmpl = 'adhocracy_core:scripts/subject_invite_sample.txt.mako'
        with open(filename, 'w') as f:
            f.write(json.dumps([
                {'name': 'Alice',
                 'email': 'alice@example.org',
                 'initial-password': '',
                 'roles': [],
                 'groups': [],
                 'badges': ['Onlinebeirat'],
                 'send_invitation_mail': True,
                 'subject_tmpl_invitation_mail': subject_tmpl}
            ]))
        locator = self._get_user_locator(context, registry)

        self.call_fut(context, registry, filename)

        alice = locator.get_user_by_login('Alice')
        reset = context['principals']['resets'].values()[0]
        mock_messenger.send_invitation_mail.assert_called_with(
            alice, reset, subject_tmpl=subject_tmpl, body_tmpl=None)

    def test_create_and_send_invitation_mail_with_custom_body(
            self, context, registry, mock_messenger):
        registry.messenger = mock_messenger
        self._tempfd, filename = mkstemp()
        body_tmpl = 'adhocracy_core:scripts/body_invite_sample.txt.mako'
        with open(filename, 'w') as f:
            f.write(json.dumps([
                {'name': 'Alice',
                 'email': 'alice@example.org',
                 'initial-password': '',
                 'roles': [],
                 'groups': [],
                 'badges': ['Onlinebeirat'],
                 'send_invitation_mail': True,
                 'body_tmpl_invitation_mail': body_tmpl}
            ]))
        locator = self._get_user_locator(context, registry)

        self.call_fut(context, registry, filename)

        alice = locator.get_user_by_login('Alice')
        reset = context['principals']['resets'].values()[0]
        mock_messenger.send_invitation_mail.assert_called_with(
            alice, reset, subject_tmpl=None, body_tmpl=body_tmpl)

    def teardown_method(self, method):
        if hasattr(self, 'tempfd'):
            os.close(self._tempfd)
