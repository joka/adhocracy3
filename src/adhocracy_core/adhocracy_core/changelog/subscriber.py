"""Update transaction changelog."""
from pyramid.location import lineage
from pyramid.registry import Registry
from pyramid.traversal import find_interface, resource_path
from pyramid.threadlocal import get_current_registry
from substanced.event import ACLModified

from adhocracy_core.interfaces import IItem
from adhocracy_core.interfaces import IResource
from adhocracy_core.interfaces import IResourceWillBeDeleted
from adhocracy_core.interfaces import IResourceSheetModified
from adhocracy_core.interfaces import IItemVersionNewVersionAdded
from adhocracy_core.interfaces import ISheetBackReferenceModified
from adhocracy_core.interfaces import IResourceCreatedAndAdded
from adhocracy_core.interfaces import VisibilityChange
from adhocracy_core.utils import get_visibility_change
from adhocracy_core.sheets.metadata import IMetadata
from adhocracy_core.utils import find_graph
from adhocracy_core.utils import list_resource_with_descendants
from adhocracy_core.resources.principal import IPasswordReset


def add_changelog_created(event):
    """Add created message to the transaction_changelog."""
    if IPasswordReset.providedBy(event.object):
        return  # don't tell others about created password resets
    _add_changelog(event.registry, event.object, key='created', value=True)
    parent = event.object.__parent__
    if parent is not None:
        _add_changelog(event.registry, parent, key='modified', value=True)
        _add_changelog(event.registry, parent, key='autoupdated', value=True)


def add_changelog_modified_sheet(event):
    """Add modified message for IResourceSheetModified events to changelog."""
    _add_changelog(event.registry, event.object, key='modified', value=True)
    appstructs = {event.isheet: event.new_appstruct}
    _add_changelog(event.registry, event.object,
                   key='modified_appstructs',
                   value=appstructs)
    _add_changed_descendants_to_all_parents(event.registry, event.object)


def add_changelog_modified_acl(event):
    """Add modified message for ACLModified events to changelog."""
    # TODO ACLModified events have no registry
    registry = get_current_registry(event.object)
    _add_changelog(registry, event.object, key='modified', value=True)
    _add_changed_descendants_to_all_parents(registry, event.object)


def _add_changed_descendants_to_all_parents(registry, resource):
    for parent in lineage(resource.__parent__):
        changed_descendants_is_changed = _add_changelog(
            registry, parent, key='changed_descendants', value=True)
        if changed_descendants_is_changed:
            _increment_changed_descendants_counter(parent)
        else:
            break


def _increment_changed_descendants_counter(context):
    counter = getattr(context, '__changed_descendants_counter__', None)
    if counter is not None:  # pragma: no branch
        counter.change(1)


def add_changelog_backrefs(event):
    """Add changed_backrefs message to the transaction_changelog."""
    _add_changelog_backrefs_for_resource(event.object, event.registry)


def _add_changelog_backrefs_for_resource(resource: IResource,
                                         registry: Registry):
    changed_backrefs_is_modified = _add_changelog(registry, resource,
                                                  key='changed_backrefs',
                                                  value=True)
    if changed_backrefs_is_modified:
        _increment_changed_backrefs_counter(resource)
    _add_changed_descendants_to_all_parents(registry, resource)


def _increment_changed_backrefs_counter(context):
    counter = getattr(context, '__changed_backrefs_counter__', None)
    if counter is not None:  # pragma: no branch
        counter.change(1)


def add_changelog_followed(event):
    """Add new `followed_by` and `last_version` to transaction_changelog."""
    if event.new_version is None:
        return
    _add_changelog(event.registry, event.object, key='followed_by',
                   value=event.new_version)
    item = find_interface(event.new_version, IItem)
    _add_changelog(event.registry, item, key='last_version',
                   value=event.new_version)


def _add_changelog(registry: Registry, resource: IResource, key: str,
                   value: object) -> bool:
    """Add metadata `key/value` to the transaction changelog if needed.

    Return: True if new metadata value was added else False (no value change)
    """
    changelog = registry.changelog
    path = resource_path(resource)
    metadata = changelog[path]
    old_value = getattr(metadata, key)
    if key == 'modified_appstructs':
        updated_old_value = old_value or dict()
        updated_old_value.update(value)
        value = updated_old_value
    if old_value != value:
        changelog[path] = metadata._replace(**{'resource': resource,
                                               key: value})
        return True
    else:
        return False


def add_changelog_visibility(event):
    """Add new visibility message to the transaction_changelog."""
    visibility = get_visibility_change(event)
    value_changed = _add_changelog(event.registry, event.object,
                                   key='visibility', value=visibility)
    if value_changed and visibility in (VisibilityChange.concealed,
                                        VisibilityChange.revealed):
        _mark_referenced_resources_as_changed(event.object, event.registry)


def _mark_referenced_resources_as_changed(resource: IResource,
                                          registry: Registry):
    graph = find_graph(resource)
    resource_and_descendants = list_resource_with_descendants(resource)
    for res in resource_and_descendants:
        references = graph.get_references(res)
        for ref in references:
            _add_changelog_backrefs_for_resource(ref.target, registry)


def add_changelog_autoupdated(event):
    """Add autoupdated message to the transaction_changelog."""
    _add_changelog(event.registry, event.object,
                   key='autoupdated',
                   value=event.autoupdated)


def includeme(config):
    """Register subscriber to update transaction changelog."""
    config.add_subscriber(add_changelog_created,
                          IResourceCreatedAndAdded)
    config.add_subscriber(add_changelog_autoupdated,
                          IResourceCreatedAndAdded)
    config.add_subscriber(add_changelog_modified_sheet,
                          IResourceSheetModified)
    config.add_subscriber(add_changelog_autoupdated,
                          IResourceSheetModified)
    config.add_subscriber(add_changelog_modified_acl,
                          ACLModified)
    config.add_subscriber(add_changelog_backrefs,
                          ISheetBackReferenceModified)
    config.add_subscriber(add_changelog_followed,
                          IItemVersionNewVersionAdded)
    config.add_subscriber(add_changelog_autoupdated,
                          IItemVersionNewVersionAdded)
    config.add_subscriber(add_changelog_visibility,
                          IResourceSheetModified,
                          event_isheet=IMetadata)
    config.add_subscriber(add_changelog_visibility,
                          IResourceWillBeDeleted)
