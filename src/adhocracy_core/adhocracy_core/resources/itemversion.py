"""Basic versionable type typically for process content."""
from pyramid.traversal import find_interface
from adhocracy_core.events import ItemVersionNewVersionAdded
from adhocracy_core.events import SheetReferenceNewVersion
from adhocracy_core.interfaces import IItem
from adhocracy_core.interfaces import IItemVersion
from adhocracy_core.interfaces import SheetToSheet
from adhocracy_core.resources import add_resource_type_to_registry
from adhocracy_core.resources import resource_meta
from adhocracy_core.resources.base import Base
from adhocracy_core.sheets.versions import IVersionable
from adhocracy_core.utils import find_graph
import adhocracy_core.sheets.metadata
import adhocracy_core.sheets.versions
import adhocracy_core.sheets.tags


def update_last_tag(version, registry, options):
    """Get `item` in lineage of `version` and update `last` tag to `version`.

    This needs to be the first 'after_creation' script executed,
    to assure the last tag is updated before any
    :class:`from adhocracy_core.interfaces import IItemVersionNewVersionAdded`
    is send.
    """
    item = find_interface(version, IItem)
    if item is None:  # ease tests
        return
    request = options.get('request', None)
    tags_sheet = registry.content.get_sheet(item,
                                            adhocracy_core.sheets.tags.ITags,
                                            request=request)
    tags_sheet.set({'LAST': version})


def notify_new_itemversion_created(context, registry, options):
    """Notify referencing Resources after creating a new ItemVersion.

    :param context: the newly created resource
    :param registry: pyramid registry
    :param option:

        root_versions:
            List with root resources. Will be passed along to
            resources that reference old versions so they can
            decide whether they should update themselfes.
        creator:
            User resource that passed to the creation events.
        autupdated:
            Flag passed to the creation events
    :return: None

    """
    new_version = context
    root_versions = options.get('root_versions', [])
    creator = options.get('creator', None)
    is_batchmode = options.get('is_batchmode', False)
    autoupdated = options['autoupdated']
    old_versions = []
    versionable = registry.content.get_sheet(context, IVersionable)
    follows = versionable.get()['follows']
    for old_version in follows:
        old_versions.append(old_version)
        _notify_itemversion_has_new_version(old_version, new_version, registry,
                                            creator, autoupdated)
        _notify_referencing_resources_about_new_version(old_version,
                                                        new_version,
                                                        root_versions,
                                                        registry,
                                                        creator,
                                                        is_batchmode)
    if follows == []:
        _notify_itemversion_has_new_version(None, new_version, registry,
                                            creator, autoupdated)


def _notify_itemversion_has_new_version(old_version, new_version, registry,
                                        creator, autoupdated):
    event = ItemVersionNewVersionAdded(old_version, new_version, registry,
                                       creator, autoupdated)
    registry.notify(event)


def _notify_referencing_resources_about_new_version(old_version,
                                                    new_version,
                                                    root_versions,
                                                    registry,
                                                    creator,
                                                    is_batchmode,
                                                    ):
    graph = find_graph(old_version)
    references = graph.get_back_references(old_version,
                                           base_reftype=SheetToSheet)
    for source, isheet, isheet_field, target in references:
        event = SheetReferenceNewVersion(source,
                                         isheet,
                                         isheet_field,
                                         old_version,
                                         new_version,
                                         registry,
                                         creator,
                                         root_versions=root_versions,
                                         is_batchmode=is_batchmode,
                                         )
        registry.notify(event)


itemversion_meta = resource_meta._replace(
    iresource=IItemVersion,
    content_class=Base,
    permission_create='create_tag',
    is_implicit_addable=False,
    basic_sheets=(adhocracy_core.sheets.metadata.IMetadata,
                  adhocracy_core.sheets.versions.IVersionable,
                  ),
    extended_sheets=(),
    after_creation=(update_last_tag,  # needs to run first, see docstring.
                    notify_new_itemversion_created),
    use_autonaming=True,
    autonaming_prefix='VERSION_',
)


def includeme(config):
    """Add resource type to registry."""
    add_resource_type_to_registry(itemversion_meta, config)
