from pytest import fixture
from pytest import mark


def test_comment_meta():
    from .comment import comment_meta
    from .comment import IComment
    from .comment import ICommentVersion
    meta = comment_meta
    assert meta.iresource is IComment
    assert meta.item_type == ICommentVersion
    assert meta.element_types == (ICommentVersion,)
    assert meta.use_autonaming
    assert meta.permission_create == 'create_comment'


def test_commentversion_meta():
    from .comment import commentversion_meta
    from .comment import ICommentVersion
    import adhocracy_core.sheets
    meta = commentversion_meta
    assert meta.iresource is ICommentVersion
    assert meta.extended_sheets == (adhocracy_core.sheets.comment.IComment,
                                    adhocracy_core.sheets.comment.ICommentable,
                                    adhocracy_core.sheets.rate.IRateable,
                                    adhocracy_core.sheets.relation.ICanPolarize,
                                    )
    assert meta.permission_create == 'edit'


def test_commentservice_meta():
    from .comment import comments_meta
    from .comment import ICommentsService
    from .comment import IComment
    import adhocracy_core.sheets
    meta = comments_meta
    assert meta.iresource is ICommentsService
    assert meta.element_types == (IComment,)
    assert meta.content_name == 'comments'
    assert meta.extended_sheets == (adhocracy_core.sheets.anonymize.IAllowAddAnonymized,
                                    )


@mark.usefixtures('integration')
class TestRoot:

    @fixture
    def context(self, pool):
        return pool

    def test_create_comment(self, context, registry):
        from adhocracy_core.resources.comment import IComment
        res = registry.content.create(IComment.__identifier__, context)
        assert IComment.providedBy(res)

    def test_create_commentversion(self, context, registry):
        from adhocracy_core.resources.comment import ICommentVersion
        res = registry.content.create(ICommentVersion.__identifier__, context)
        assert ICommentVersion.providedBy(res)

    def test_create_commentsservice(self, context, registry):
        from adhocracy_core.resources.comment import ICommentsService
        from substanced.util import find_service
        res = registry.content.create(ICommentsService.__identifier__, context)
        assert ICommentsService.providedBy(res)
        assert find_service(context, 'comments')

    def test_add_commentsservice(self, context, registry):
        from adhocracy_core.resources.comment import add_commentsservice
        add_commentsservice(context, registry, {})
        assert context['comments']
